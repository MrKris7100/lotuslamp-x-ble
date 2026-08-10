'use strict';

const Homey = require('homey');

class LedStripDriver extends Homey.Driver {

  async onInit() {
    this.log('LedStrip driver has been initialized');
  }

  async onPairListDevices() {
    const advertisements = await this.homey.ble.discover();

    this.log(`Discovered ${advertisements.length} advertisement(s) total`);

    return advertisements
      .filter((advertisement) => typeof advertisement.localName === 'string'
        && advertisement.localName.startsWith("ELK-BLE"))
      .map((advertisement) => {
        this.log(`Match: ${advertisement.localName} (${advertisement.uuid})`);
        return advertisement;
      })
      .map((advertisement) => ({
        name: `LED Strip ${advertisement.uuid.slice(-6).toUpperCase()}`,
        data: {
          id: advertisement.uuid,
        },
        store: {
          peripheralUuid: advertisement.uuid,
        },
      }));
  }

}

module.exports = LedStripDriver;