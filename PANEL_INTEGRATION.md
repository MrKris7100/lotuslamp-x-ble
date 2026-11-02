# Lotuslamp X Panel integration

The production Lotuslamp X Panel application uses this package for BLE device discovery and controller control. From the repository root, install the BLE library into the panel's Python environment with:

```powershell
python -m pip install ./lotuslamp-x
```

The panel code imports `LotusLampDevice` and `discover_devices` from `lotuslamp_x_ble`. `lotuslamp_x.device` and `lotuslamp_x.protocol` remain backwards-compatible re-export modules for older integrations.

This library is an independently buildable distribution. The panel remains the production application and is not included in the library wheel.
