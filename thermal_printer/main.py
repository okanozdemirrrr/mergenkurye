"""
Sessiz termal yazici — Supabase web siparislerini varsayilan Windows yazicisina basar.
Terminalde: python main.py
"""

from __future__ import annotations

import os
import sys
import textwrap
import time
from datetime import datetime
from typing import Any

import win32print
from dotenv import load_dotenv
from supabase import Client, create_client

# 80mm termal yazici ~ 48 karakter (Font A)
LINE_WIDTH = 48
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))

PAYMENT_LABELS = {
    "cash": "NAKIT",
    "card": "KART",
    "iban": "IBAN",
}


def load_config() -> tuple[str, str, str | None]:
    load_dotenv()

    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    restaurant_id = os.getenv("RESTAURANT_ID")

    if not url or not key:
        print(
            "HATA: .env dosyasinda SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanimli olmali.",
            file=sys.stderr,
        )
        sys.exit(1)

    return url, key, restaurant_id


def create_supabase_client(url: str, key: str) -> Client:
    return create_client(url, key)


def center(text: str, width: int = LINE_WIDTH) -> str:
    text = text.strip()
    if len(text) >= width:
        return text[:width]
    pad = (width - len(text)) // 2
    return " " * pad + text


def divider(char: str = "-") -> str:
    return char * LINE_WIDTH


def wrap_lines(text: str, width: int = LINE_WIDTH) -> list[str]:
    if not text:
        return ["-"]
    lines: list[str] = []
    for raw_line in text.replace("\r", "").split("\n"):
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        lines.extend(textwrap.wrap(raw_line, width=width) or [""])
    return lines or ["-"]


def format_receipt(order: dict[str, Any], restaurant_name: str = "MERGEN KURYE") -> str:
    created = order.get("created_at") or datetime.now().isoformat()
    try:
        dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        date_str = dt.strftime("%d.%m.%Y %H:%M")
    except ValueError:
        date_str = str(created)[:16]

    order_no = order.get("order_number") or f"#{order.get('id', '?')}"
    customer = order.get("customer_name") or "Belirtilmemis"
    phone = order.get("customer_phone") or "-"
    address = order.get("delivery_address") or "Adres yok"
    content = order.get("content") or "Belirtilmemis"
    amount = order.get("amount", 0)
    payment = PAYMENT_LABELS.get(str(order.get("payment_method") or "").lower(), "BELIRTILMEMIS")

    lines: list[str] = [
        center(restaurant_name),
        divider("="),
        center(f"SIPARIS {order_no}"),
        center(date_str),
        divider(),
        "MUSTERI:",
        *wrap_lines(customer),
        f"TEL: {phone}",
        "ADRES:",
        *wrap_lines(address),
        divider(),
        "ICERIK:",
        *wrap_lines(content),
        divider(),
        f"TOPLAM: {float(amount):.2f} TL".rjust(LINE_WIDTH),
        f"ODEME: {payment}".rjust(LINE_WIDTH),
        divider("="),
        center("Afiyet olsun"),
        "",
        "",
    ]
    return "\n".join(lines)


def encode_for_printer(text: str) -> bytes:
    """Turkce karakterler icin cp857 (ESC/POS), olmazsa cp1254."""
    for encoding in ("cp857", "cp1254", "latin-1"):
        try:
            return text.encode(encoding)
        except UnicodeEncodeError:
            continue
    return text.encode("latin-1", errors="replace")


def print_raw_silent(receipt_text: str) -> None:
    printer_name = win32print.GetDefaultPrinter()
    raw_data = encode_for_printer(receipt_text)

    # Kagit kesme + satir besleme (ESC/POS)
    raw_data += b"\n\n\n\x1d\x56\x00"

    hprinter = win32print.OpenPrinter(printer_name)
    try:
        job = win32print.StartDocPrinter(
            hprinter,
            1,
            ("MergenWebSiparis", None, "RAW"),
        )
        try:
            win32print.StartPagePrinter(hprinter)
            win32print.WritePrinter(hprinter, raw_data)
            win32print.EndPagePrinter(hprinter)
        finally:
            win32print.EndDocPrinter(hprinter)
    finally:
        win32print.ClosePrinter(hprinter)

    print(f"[OK] Yazdirildi -> {printer_name}")


def fetch_pending_orders(client: Client, restaurant_id: str | None) -> list[dict[str, Any]]:
    query = (
        client.table("packages")
        .select(
            "id, order_number, customer_name, customer_phone, delivery_address, "
            "amount, content, payment_method, platform, status, is_printed, "
            "created_at, restaurant_id"
        )
        .eq("platform", "web")
        .eq("status", "new_order")
        .eq("is_printed", False)
        .order("created_at", desc=False)
        .limit(20)
    )

    if restaurant_id:
        query = query.eq("restaurant_id", restaurant_id)

    response = query.execute()
    rows = response.data or []

    # is_printed NULL olanlari da yakala
    return [row for row in rows if row.get("is_printed") in (False, None, 0)]


def mark_as_printed(client: Client, package_id: int) -> None:
    client.table("packages").update({"is_printed": True}).eq("id", package_id).execute()


def fetch_restaurant_name(client: Client, restaurant_id: Any) -> str:
    if not restaurant_id:
        return "RESTORAN"
    try:
        res = (
            client.table("restaurants")
            .select("name")
            .eq("id", restaurant_id)
            .single()
            .execute()
        )
        if res.data and res.data.get("name"):
            return str(res.data["name"]).upper()
    except Exception:
        pass
    return "RESTORAN"


def process_order(client: Client, order: dict[str, Any]) -> None:
    package_id = order["id"]
    restaurant_name = fetch_restaurant_name(client, order.get("restaurant_id"))
    receipt = format_receipt(order, restaurant_name)

    print(f"[PRINT] Siparis #{package_id} ({order.get('order_number', '-')}) hazirlaniyor...")
    print_raw_silent(receipt)
    mark_as_printed(client, package_id)
    print(f"[DB] is_printed=true -> paket #{package_id}")


def main() -> None:
    url, key, restaurant_id = load_config()
    client = create_supabase_client(url, key)

    print("=" * LINE_WIDTH)
    print(center("MERGEN TERMAL YAZICI"))
    print(f"Yazici: {win32print.GetDefaultPrinter()}")
    print(f"Poll: her {POLL_INTERVAL} sn")
    if restaurant_id:
        print(f"Restoran filtresi: {restaurant_id}")
    print("Durdurmak icin Ctrl+C")
    print("=" * LINE_WIDTH)

    while True:
        try:
            orders = fetch_pending_orders(client, restaurant_id)
            if orders:
                print(f"[POLL] {len(orders)} yazdirilmamis web siparisi bulundu.")
            for order in orders:
                try:
                    process_order(client, order)
                except Exception as exc:
                    print(f"[HATA] Paket #{order.get('id')} yazdirilamadi: {exc}", file=sys.stderr)
        except Exception as exc:
            print(f"[HATA] Poll basarisiz: {exc}", file=sys.stderr)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
