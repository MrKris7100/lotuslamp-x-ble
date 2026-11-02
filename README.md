# LotusLamp X BLE library

Standalone asynchronous Python library for discovering and controlling LotusLamp X BLE LED controllers.
The published distribution is named `lotuslamp-x-ble`; import it as `lotuslamp_x_ble`.

## Requirements

- Python 3.10 or later
- Bluetooth LE adapter supported by [Bleak](https://bleak.readthedocs.io/)
- LotusLamp controller advertising a name beginning with `ELK-BLE`

## Install

```powershell
python -m pip install lotuslamp-x-ble
```

## Quick start

```python
import asyncio
from lotuslamp_x_ble import LotusLampDevice, discover_devices

async def main():
	devices = await discover_devices(timeout=5.0)
	if not devices:
		raise RuntimeError("No LotusLamp controllers found")

	async with LotusLampDevice(devices[0].address) as strip:
		await strip.set_power(True)
		await strip.set_brightness(75)
		await strip.set_rgb(255, 80, 0)
		await strip.set_power(False)

asyncio.run(main())
```

## API

- `discover_devices(timeout=5.0)` asynchronously discovers nearby controllers with names beginning `ELK-BLE`.
- `LotusLampDevice(address)` manages a single async BLE connection and is an async context manager.
- `connect()` / `disconnect()` connect or disconnect and validate the expected BLE service and characteristic.
- `set_power(enabled)`, `set_brightness(level)`, `set_rgb(red, green, blue)`, `set_hsl(hue, saturation, lightness)`, `set_hue(hue)`, and `set_saturation(saturation)` send controller commands.
- `SERVICE_UUID`, `CHARACTERISTIC_UUID` and the command encoders are available for integrations.

The controller protocol uses the BLE service `FFF0` and write characteristic `FFF3`. The controller does not expose state through the implemented protocol; methods send commands and do not read back the physical state.

## Build and publish

```powershell
python -m pip install build
python -m build
```

The wheel and source archive are written to `dist/`. Publishing is a separate, explicit release operation; building does not upload the package.

## License

GNU General Public License v3.0 only. See `LICENSE`.

## Credits

Special thanks to original author https://github.com/smarthomesven/homey-lotuslamp-x