"""BLE client for LotusLamp X LED strip controllers."""

from __future__ import annotations

from bleak import BleakClient, BleakScanner

from .protocol import (
	CHARACTERISTIC_UUID,
	SERVICE_UUID,
	brightness_command,
	hsl_to_rgb,
	power_command,
	rgb_command,
)


async def discover_devices(timeout: float = 5.0):
	"""Return nearby LotusLamp-compatible BLE devices."""
	devices = await BleakScanner.discover(timeout=timeout)
	return [device for device in devices if device.name and device.name.startswith("ELK-BLE")]


class LotusLampDevice:
	"""Async BLE connection and control API for one LotusLamp controller."""

	def __init__(self, address: str):
		self.address = address
		self._client: BleakClient | None = None
		self.hue = 0
		self.saturation = 0
		self.lightness = 50

	async def connect(self) -> None:
		if self._client is not None and self._client.is_connected:
			return

		client = BleakClient(self.address)
		await client.connect()
		if client.services.get_service(SERVICE_UUID) is None:
			await client.disconnect()
			raise RuntimeError(f"Urządzenie nie udostępnia usługi BLE {SERVICE_UUID}.")
		if client.services.get_characteristic(CHARACTERISTIC_UUID) is None:
			await client.disconnect()
			raise RuntimeError(f"Brak charakterystyki zapisu BLE {CHARACTERISTIC_UUID}.")
		self._client = client

	async def disconnect(self) -> None:
		if self._client is not None and self._client.is_connected:
			await self._client.disconnect()
		self._client = None

	async def __aenter__(self) -> LotusLampDevice:
		await self.connect()
		return self

	async def __aexit__(self, exc_type, exc_value, traceback) -> None:
		await self.disconnect()

	async def _write(self, command: bytes) -> None:
		if self._client is None or not self._client.is_connected:
			await self.connect()
		await self._client.write_gatt_char(CHARACTERISTIC_UUID, command, response=False)

	async def set_power(self, enabled: bool) -> None:
		await self._write(power_command(enabled))

	async def set_brightness(self, level: int) -> None:
		await self._write(brightness_command(level))

	async def set_rgb(self, red: int, green: int, blue: int) -> None:
		await self._write(rgb_command(red, green, blue))

	async def set_hue(self, hue: int) -> None:
		if not 0 <= hue <= 360:
			raise ValueError("Odcień musi mieścić się w zakresie 0–360.")
		await self.set_hsl(hue, self.saturation, self.lightness)

	async def set_saturation(self, saturation: int) -> None:
		if not 0 <= saturation <= 100:
			raise ValueError("Nasycenie musi mieścić się w zakresie 0–100.")
		await self.set_hsl(self.hue, saturation, self.lightness)

	async def set_hsl(self, hue: int, saturation: int, lightness: int) -> None:
		rgb = hsl_to_rgb(hue, saturation, lightness)
		self.hue = hue
		self.saturation = saturation
		self.lightness = lightness
		await self._write(rgb_command(*rgb))
