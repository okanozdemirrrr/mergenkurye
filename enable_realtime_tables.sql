-- Realtime için packages ve couriers tablolarını publication'a ekle
ALTER PUBLICATION supabase_realtime ADD TABLE packages;
ALTER PUBLICATION supabase_realtime ADD TABLE couriers;
