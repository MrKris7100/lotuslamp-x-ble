"""LotusLamp X BLE command encoding."""

SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb"
CHARACTERISTIC_UUID = "0000fff3-0000-1000-8000-00805f9b34fb"


def power_command(enabled: bool) -> bytes:
	value = 0x01 if enabled else 0x00
	return bytes((0x7E, 0x04, 0x04, value, 0x00, value, 0xFF, 0x00, 0xEF))


def brightness_command(level: int) -> bytes:
	if not isinstance(level, int) or not 0 <= level <= 100:
		raise ValueError("Jasność musi być liczbą całkowitą z zakresu 0–100.")
	return bytes((0x7E, 0x04, 0x01, level, 0xFF, 0xFF, 0xFF, 0x00, 0xEF))


def rgb_command(red: int, green: int, blue: int) -> bytes:
	channels = (red, green, blue)
	if any(not isinstance(channel, int) or not 0 <= channel <= 255 for channel in channels):
		raise ValueError("Kanały RGB muszą być liczbami całkowitymi z zakresu 0–255.")
	return bytes((0x7E, 0x07, 0x05, 0x03, red, green, blue, 0x10, 0xEF))


def _hue_to_rgb(p: float, q: float, hue: float) -> float:
	if hue < 0:
		hue += 1
	if hue > 1:
		hue -= 1
	if hue < 1 / 6:
		return p + (q - p) * 6 * hue
	if hue < 1 / 2:
		return q
	if hue < 2 / 3:
		return p + (q - p) * (2 / 3 - hue) * 6
	return p


def hsl_to_rgb(hue: float, saturation: float, lightness: float) -> tuple[int, int, int]:
	"""Convert HSL values (hue 0–360, saturation/lightness 0–100) to RGB."""
	if not 0 <= hue <= 360 or not 0 <= saturation <= 100 or not 0 <= lightness <= 100:
		raise ValueError("HSL poza zakresem: hue 0–360, saturation/lightness 0–100.")

	h = hue / 360
	s = saturation / 100
	l = lightness / 100
	if s == 0:
		channels = (l, l, l)
	else:
		q = l * (1 + s) if l < 0.5 else l + s - l * s
		p = 2 * l - q
		channels = (
			_hue_to_rgb(p, q, h + 1 / 3),
			_hue_to_rgb(p, q, h),
			_hue_to_rgb(p, q, h - 1 / 3),
		)
	return tuple(int(channel * 255 + 0.5) for channel in channels)
