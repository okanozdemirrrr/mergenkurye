@echo off
echo Creating keystore for Mergen Kurye...

"%JAVA_HOME%\bin\keytool" -genkey -v -keystore android\app\mergen-kurye-release.keystore -alias mergen-kurye -keyalg RSA -keysize 2048 -validity 10000 -storepass mergen2026 -keypass mergen2026 -dname "CN=Mergen Kurye, OU=Development, O=Mergen, L=Istanbul, ST=Istanbul, C=TR"

if %ERRORLEVEL% EQU 0 (
    echo Keystore created successfully!
) else (
    echo Failed to create keystore. Make sure JAVA_HOME is set.
)

pause
