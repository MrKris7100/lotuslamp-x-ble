'use strict';

const Homey = require('homey');

const SERVICE_UUID = 'fff0';
const CHARACTERISTIC_UUID = 'fff3';

function hslToRgb(h, s, l) {
  let r;
  let g;
  let b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

class LedStripDevice extends Homey.Device {

  async onInit() {
    this.hue = 0;
    this.saturation = 0;
    this.lightness = 0.5;
    this.peripheral = undefined;
    this.connecting = null;

    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', (value) => this.setPower(value));
    }
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', (value) => this.setBrightness(Math.round(value * 100)));
    }
    if (this.hasCapability('light_hue')) {
      this.registerCapabilityListener('light_hue', (value) => this.setHue(Math.round(value * 360)));
    }
    if (this.hasCapability('light_saturation')) {
      this.registerCapabilityListener('light_saturation', (value) => this.setSaturation(Math.round(value * 100)));
    }

    this.log('LedStrip device has been initialized');
  }

  async onUninit() {
    if (this.peripheral && this.peripheral.isConnected) {
      try {
        await this.peripheral.disconnect();
      } catch (err) {
        this.error('Error disconnecting on uninit:', err.message);
      }
    }
  }

  async getWriteCharacteristic() {
    if (this.peripheral && this.peripheral.isConnected && this.writeCharacteristic) {
      return this.writeCharacteristic;
    }

    if (!this.connecting) {
      this.connecting = this._connect().finally(() => {
        this.connecting = null;
      });
    }

    await this.connecting;
    return this.writeCharacteristic;
  }

  async _connect() {
    const { peripheralUuid } = this.getStore();

    this.log(`Connecting to ${peripheralUuid}...`);
    const advertisement = await this.homey.ble.find(peripheralUuid);
    const peripheral = await advertisement.connect();
    this.peripheral = peripheral;

    const services = await peripheral.discoverServices([SERVICE_UUID]);
    const service = services[0];
    if (!service) throw new Error('Could not find service fff0');

    const characteristics = await service.discoverCharacteristics([CHARACTERISTIC_UUID]);
    const characteristic = characteristics[0];
    if (!characteristic) throw new Error('Could not find characteristic fff3');

    this.writeCharacteristic = characteristic;
    this.log('Connected and ready');

    peripheral.once('disconnect', () => {
      this.log('Peripheral disconnected');
      this.writeCharacteristic = undefined;
    });
  }

  async setPower(status) {
    const characteristic = await this.getWriteCharacteristic();
    const buffer = Buffer.from(
      `7e0404${status ? '01' : '00'}00${status ? '01' : '00'}ff00ef`,
      'hex',
    );
    await characteristic.write(buffer);
    this.log('Power command sent');
  }

  async setBrightness(level) {
    if (level > 100 || level < 0) return;
    const characteristic = await this.getWriteCharacteristic();
    const levelHex = (`0${level.toString(16)}`).slice(-2);
    const buffer = Buffer.from(`7e0401${levelHex}ffffff00ef`, 'hex');
    await characteristic.write(buffer);
    this.log('Brightness command sent');
  }

  async setRgb(r, g, b) {
    const characteristic = await this.getWriteCharacteristic();
    const rHex = (`0${r.toString(16)}`).slice(-2);
    const gHex = (`0${g.toString(16)}`).slice(-2);
    const bHex = (`0${b.toString(16)}`).slice(-2);
    const buffer = Buffer.from(`7e070503${rHex}${gHex}${bHex}10ef`, 'hex');
    await characteristic.write(buffer);
    this.log('Colour command sent');
  }

  async setHue(hue) {
    this.hue = hue;
    const [r, g, b] = hslToRgb(hue / 360, this.saturation / 100, this.lightness);
    await this.setRgb(r, g, b);
  }

  async setSaturation(saturation) {
    this.saturation = saturation;
    const [r, g, b] = hslToRgb(this.hue / 360, saturation / 100, this.lightness);
    await this.setRgb(r, g, b);
  }

}

module.exports = LedStripDevice;