---
title: "Scrcpy Wireless Android Casting"
date: "2025-01-17"
categories: [Android]
---

# Escrcpy
Maybe `Escrcpy` is a better solution <https://github.com/viarotel-org/escrcpy>

# Connect to the phone
1. Download and unzip `scrcpy` (If your are using `Windows`, download `scrcpy-win64-$version.zip`) <https://github.com/Genymobile/scrcpy/releases/>
2. Connect phone to PC via USB cable
3. Make sure turn on the USB debugging on your phone
4. Open terminal inside the `scrcpy` folder
5. `./adb devices`
6. `./adb tcpip 5555`
7. **Unplug USB cable**
8. Go to settings search `ip` in settings and remember the ip address (Make sure your phone and PC are in the same `LAN` i.e. connect to same WIFI)
9.  `./adb connect 192.168.1.xx:5555`
10. `./scrcpy.exe`
11. If you want to disconnect, first use `./adb devices` to check the ip address and port. Then `./adb disconnect 192.168.1.xx:5555`

# Usage
- Right Click: `Back`
- Middle Click: `Home`
- You can use clipboard across PC and your phone
- Create a desktop shortcut for `scrcpy.exe` (Maybe rename it to `My Phone`)
- If scrcpy doesn't support audio forwarding for your phone. You can try [Bluetooth Audio Receiver](https://apps.microsoft.com/detail/9n9wclwdqs5j?hl=en-US&gl=US)
- You can add the `scrcpy` folder path to the `PATH` environmental variable so that you can directly use `adb` and `scrcpy` commands in the terminal
- <https://github.com/Genymobile/scrcpy>
