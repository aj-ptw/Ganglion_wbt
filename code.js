const RECEIVE_UUID = '2d30c082-f39f-4ce6-923f-3484ea480596';
const SEND_UUID = '2d30c083-f39f-4ce6-923f-3484ea480596';
const DISCONNECT_UUID = '2d30c084-f39f-4ce6-923f-3484ea480596';

let connect_button = document.getElementById('connect_btn');
let read_button = document.getElementById('read_btn');
let receive_characteristic;
let send_characteristic;
let disconnect_characteristic;
let gang_name;

connect_button.addEventListener('click', function(event) {
  if (connect_button.classList.contains('disconnected')) {
    connectToServices()
    .then(_ => {
      //Changes button class when successful
      connect_button.className = "btn btn-success connected";
      connect_button.innerText = "Disconnect Ganglion";
      console.log('Connected to ' + gang_name);
    })
    .catch(error => { console.log(error); });
  } else {
    disconnectFromServices()
    .then(_ => {
      //Changes button class when successful
      connect_button.className = "btn btn-primary disconnected";
      connect_button.innerText = "Connect to Ganglion";
      console.log('Ganglion has been disconnected');
    });
  };
});

read_button.addEventListener('click', function(event){
  let encoder = new TextEncoder();
  let startStream = encoder.encode('b');
  send_characteristic.writeValue(startStream)
  .then(() =>{
    return receive_characteristic.readValue();
  })
  .then(value => {
    console.log(value);
    read_button.className = "btn btn-success";
  })
  .catch(error => { console.log(error); });

  receiveNotification(receive_characteristic)
});


function connectToServices(){
  return navigator.bluetooth.requestDevice({ filters: [{ namePrefix: 'Ganglion-' }], optionalServices: [0xfe84] })
  .then(device => {
    // Human-readable name of the device.
    console.log('Connecting to ' + device.name + ' ...');
    gang_name = device.name;

    // Attempts to connect to remote GATT Server.
    return device.gatt.connect();
  })
  .then(server => {
    // Getting Primary Service
    return server.getPrimaryService(0xfe84);
  })
  .then(service => {
    // Getting All Characteristics
    return service.getCharacteristics();
  })
  .then(characteristics => {
    // Assign a specific variable to each characteristic
    receive_characteristic = characteristics.find(char => char.uuid === RECEIVE_UUID);
    send_characteristic = characteristics.find(char => char.uuid === SEND_UUID);
    disconnect_characteristic = characteristics.find(char => char.uuid === DISCONNECT_UUID);
  });
};

function disconnectFromServices(){
  var disconnect_signal = new Uint8Array([1]);
  return disconnect_characteristic.writeValue(disconnect_signal)
  .catch(error => { console.log(error); });
};

function receiveNotification(characteristic){
  characteristic.startNotifications()
  .then(_ => {
    characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
  })
  .then(_ => {
  console.log('Notifications have been started.');
  })
  .catch(error => { console.log(error); });
};

function handleCharacteristicValueChanged(event) {
  var value = event.target.value;
  processBytes(value)
  // console.log('Received ' + value);
  // TODO: Parse Heart Rate Measurement value.
  // See https://github.com/WebBluetoothCG/demos/blob/gh-pages/heart-rate-sensor/heartRateSensor.js
};

// From OpenBCI_NodeJS_Ganglion

const kOBCIGanglionByteId18Bit = {
  max: 100,
  min: 1
};
const kOBCIGanglionByteId19Bit = {
  max: 200,
  min: 101
};
const kOBCIGanglionByteIdUncompressed = 0;
const kOBCIGanglionByteIdImpedanceChannel1 = 201;
const kOBCIGanglionByteIdImpedanceChannel2 = 202;
const kOBCIGanglionByteIdImpedanceChannel3 = 203;
const kOBCIGanglionByteIdImpedanceChannel4 = 204;
const kOBCIGanglionByteIdImpedanceChannelReference = 205;
const kOBCIGanglionByteIdMultiPacket = 206;
const kOBCIGanglionByteIdMultiPacketStop = 207;
const kOBCIGanglionPacketSize = 20;
const kOBCIGanglionSamplesPerPacket = 2;
const kOBCIGanglionPacket18Bit = {
  auxByte: 20,
  byteId: 0,
  dataStart: 1,
  dataStop: 19
};
const kOBCIGanglionPacket19Bit = {
  byteId: 0,
  dataStart: 1,
  dataStop: 20
};
const kOBCIGanglionMCP3912Gain = 1.0;  // assumed gain setting for MCP3912.  NEEDS TO BE ADJUSTABLE JM
const kOBCIGanglionMCP3912Vref = 1.2;  // reference voltage for ADC in MCP3912 set in hardware
const kOBCIGanglionPrefix = 'Ganglion';
const kOBCIGanglionSyntheticDataEnable = 't';
const kOBCIGanglionSyntheticDataDisable = 'T';
const kOBCIGanglionImpedanceStart = 'z';
const kOBCIGanglionImpedanceStop = 'Z';
const kOBCIGanglionScaleFactorPerCountVolts = kOBCIGanglionMCP3912Vref / (8388607.0 * kOBCIGanglionMCP3912Gain * 1.5 * 51.0);
const kOBCINumberOfChannelsGanglion = 4;
/** Accel packets */
const kOBCIGanglionAccelAxisX = 1;
const kOBCIGanglionAccelAxisY = 2;
const kOBCIGanglionAccelAxisZ = 3;

/** Accel scale factor */
const kOBCIGanglionAccelScaleFactor = 0.032; // mG per count

function processBytes(data) {
  let byteID = parseInt(data[0]);
  if (byteId <= kOBCIGanglionByteId19Bit.max) {
    _processProcessSampleData(data);
  } else {
    switch (byteId) {
      case kOBCIGanglionByteIdMultiPacket:
        _processMultiBytePacket(data);
        break;
      case kOBCIGanglionByteIdMultiPacketStop:
        _processMultiBytePacketStop(data);
        break;
      case kOBCIGanglionByteIdImpedanceChannel1:
      case kOBCIGanglionByteIdImpedanceChannel2:
      case kOBCIGanglionByteIdImpedanceChannel3:
      case kOBCIGanglionByteIdImpedanceChannel4:
      case kOBCIGanglionByteIdImpedanceChannelReference:
        _processImpedanceData(data);
        break;
      default:
        _processOtherData(data);
    }
  }
}

let packetCounter = kOBCIGanglionByteId18Bit.max;
let firstPacket = true;
let _accelArray = [0, 0, 0];
let droppedPacketCounter = 0;
let _decompressedSamples = new Array(3);
let sendCounts = false;


function droppedPacket(droppedPacketNumber) {
  //this.emit(k.OBCIEmitterDroppedPacket, [droppedPacketNumber]);
  droppedPacketCounter++;
}

function resetDroppedPacketSystem() {
  packetCounter = -1;
  firstPacket = true;
  droppedPacketCounter = 0;
}


/**
 * Checks for dropped packets
 * @param data {Buffer}
 * @private
 */
function _processProcessSampleData(data) {
  const curByteId = parseInt(data[0]);
  const difByteId = curByteId - packetCounter;

  if (firstPacket) {
    firstPacket = false;
    _processRouteSampleData(data);
    return;
  }

  // Wrap around situation
  if (difByteId < 0) {
    if (packetCounter <= kOBCIGanglionByteId18Bit.max) {
      if (packetCounter === kOBCIGanglionByteId18Bit.max) {
        if (curByteId !== kOBCIGanglionByteIdUncompressed) {
          droppedPacket(curByteId - 1);
        }
      } else {
        let tempCounter = packetCounter + 1;
        while (tempCounter <= kOBCIGanglionByteId18Bit.max) {
          droppedPacket(tempCounter);
          tempCounter++;
        }
      }
    } else if (packetCounter === kOBCIGanglionByteId19Bit.max) {
      if (curByteId !== kOBCIGanglionByteIdUncompressed) {
        droppedPacket(curByteId - 1);
      }
    } else {
      let tempCounter = packetCounter + 1;
      while (tempCounter <= kOBCIGanglionByteId19Bit.max) {
        droppedPacket(tempCounter);
        tempCounter++;
      }
    }
  } else if (difByteId > 1) {
    if (packetCounter === kOBCIGanglionByteIdUncompressed && curByteId === kOBCIGanglionByteId19Bit.min) {
      _processRouteSampleData(data);
      return;
    } else {
      let tempCounter = packetCounter + 1;
      while (tempCounter < curByteId) {
        droppedPacket(tempCounter);
        tempCounter++;
      }
    }
  }
  _processRouteSampleData(data);
}

function _processRouteSampleData(data) {
  if (parseInt(data[0]) === kOBCIGanglionByteIdUncompressed) {
    _processUncompressedData(data);
  } else {
    _processCompressedData(data);
  }
}

/**
 * Process and emit an impedance value
 * @param data {Buffer}
 * @private
 */
function _processImpedanceData(data) {
  const byteId = parseInt(data[0]);
  let channelNumber;
  switch (byteId) {
    case kOBCIGanglionByteIdImpedanceChannel1:
      channelNumber = 1;
      break;
    case kOBCIGanglionByteIdImpedanceChannel2:
      channelNumber = 2;
      break;
    case kOBCIGanglionByteIdImpedanceChannel3:
      channelNumber = 3;
      break;
    case kOBCIGanglionByteIdImpedanceChannel4:
      channelNumber = 4;
      break;
    case kOBCIGanglionByteIdImpedanceChannelReference:
      channelNumber = 0;
      break;
  }

  let output = {
    channelNumber: channelNumber,
    impedanceValue: 0
  };

  let end = data.length;

  while (isNaN(Number(data.slice(1, end))) && end !== 0) {
    end--;
  }

  if (end !== 0) {
    output.impedanceValue = Number(data.slice(1, end));
  }

  /**
   * TODO: DO SOMETHING WITH OUTPUT IF YOU ARE TRYING TO SHOW IMPEDANCE
   */
  // IN NODE WE DO: this.emit('impedance', output);
}

/**
 * The base implementation of `isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function isNaN(value) {
  return value !== value
}

/**
 * Utilize `receivedDeltas` to get actual count values.
 * @param receivedDeltas {Array} - An array of deltas
 *  of shape 2x4 (2 samples per packet and 4 channels per sample.)
 * @private
 */
function _decompressSamples(receivedDeltas) {
  // add the delta to the previous value
  for (let i = 1; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      _decompressedSamples[i][j] = _decompressedSamples[i - 1][j] - receivedDeltas[i - 1][j];
    }
  }
}

/**
 * Builds a sample object from an array and sample number.
 * @param sampleNumber
 * @param rawData
 * @return {{sampleNumber: *}}
 * @private
 */
function _buildSample(sampleNumber, rawData) {
  let sample = {
    sampleNumber: sampleNumber,
    timeStamp: Date.now()
  };
  if (sendCounts) {
    sample['channelDataCounts'] = rawData;
  } else {
    sample['channelData'] = [];
    for (let j = 0; j < kOBCINumberOfChannelsGanglion; j++) {
      sample.channelData.push(rawData[j] * kOBCIGanglionScaleFactorPerCountVolts);
    }
  }
  return sample;
}

/**
 * Process an compressed packet of data.
 * @param data {Buffer}
 *  Data packet buffer from noble.
 * @private
 */
function _processCompressedData(data) {
  // Save the packet counter
  packetCounter = parseInt(data[0]);
  let sample1, sample2;

  // Decompress the buffer into array
  if (packetCounter <= kOBCIGanglionByteId18Bit.max) {
    _decompressSamples(decompressDeltas18Bit(data.slice(kOBCIGanglionPacket18Bit.dataStart, kOBCIGanglionPacket18Bit.dataStop)));
    switch (packetCounter % 10) {
      case kOBCIGanglionAccelAxisX:
        _accelArray[0] = sendCounts ? data.readInt8(kOBCIGanglionPacket18Bit.auxByte - 1) : data.readInt8(kOBCIGanglionPacket18Bit.auxByte - 1) * kOBCIGanglionAccelScaleFactor;
        break;
      case kOBCIGanglionAccelAxisY:
        _accelArray[1] = sendCounts ? data.readInt8(kOBCIGanglionPacket18Bit.auxByte - 1) : data.readInt8(kOBCIGanglionPacket18Bit.auxByte - 1) * kOBCIGanglionAccelScaleFactor;
        break;
      case kOBCIGanglionAccelAxisZ:
        _accelArray[2] = sendCounts ? data.readInt8(kOBCIGanglionPacket18Bit.auxByte - 1) : data.readInt8(kOBCIGanglionPacket18Bit.auxByte - 1) * kOBCIGanglionAccelScaleFactor;
        /**
         * TODO: DO SOMETHING WITH ACCEL DATA IF YOUR INTO THAT SORT OF THING
         */
        // IN NODE WE DO: this.emit(k.OBCIEmitterAccelerometer, this._accelArray);
        break;
      default:
        break;
    }
    sample1 = _buildSample(packetCounter * 2 - 1, _decompressedSamples[1]);
    /**
     * TODO: DO SOMETHING WITH NEW SAMPLE 1
     */
    // IN NODE WE DO: this.emit(k.OBCIEmitterSample, sample1);

    sample2 = _buildSample(packetCounter * 2, _decompressedSamples[2]);
    /**
     * TODO: DO SOMETHING WITH NEW SAMPLE 2
     */
    // IN NODE WE DO: this.emit(k.OBCIEmitterSample, sample2);

  } else {
    _decompressSamples(decompressDeltas19Bit(data.slice(kOBCIGanglionPacket19Bit.dataStart, kOBCIGanglionPacket19Bit.dataStop)));

    sample1 = _buildSample((packetCounter - 100) * 2 - 1, _decompressedSamples[1]);
    /**
     * TODO: DO SOMETHING WITH NEW SAMPLE 1
     */
    // IN NODE WE DO: this.emit(k.OBCIEmitterSample, sample1);

    sample2 = _buildSample((packetCounter - 100) * 2, _decompressedSamples[2]);
    /**
     * TODO: DO SOMETHING WITH NEW SAMPLE 2
     */
    // IN NODE WE DO: this.emit(k.OBCIEmitterSample, sample2);
  }
  console.log('sample1', sample1);
  console.log('sample2', sample2);

  // Rotate the 0 position for next time
  for (let i = 0; i < kOBCINumberOfChannelsGanglion; i++) {
    _decompressedSamples[0][i] = _decompressedSamples[2][i];
  }
}

/**
 * Converts a special ganglion 18 bit compressed number
 *  The compressions uses the LSB, bit 1, as the signed bit, instead of using
 *  the MSB. Therefore you must not look to the MSB for a sign extension, one
 *  must look to the LSB, and the same rules applies, if it's a 1, then it's a
 *  negative and if it's 0 then it's a positive number.
 * @param threeByteBuffer {Buffer}
 *  A 3-byte buffer with only 18 bits of actual data.
 * @return {number} A signed integer.
 */
function convert18bitAsInt32 (threeByteBuffer) {
  let prefix = 0;

  if (threeByteBuffer[2] & 0x01 > 0) {
    // console.log('\t\tNegative number')
    prefix = 0b11111111111111;
  }

  return (prefix << 18) | (threeByteBuffer[0] << 16) | (threeByteBuffer[1] << 8) | threeByteBuffer[2];
}

/**
 * Converts a special ganglion 19 bit compressed number
 *  The compressions uses the LSB, bit 1, as the signed bit, instead of using
 *  the MSB. Therefore you must not look to the MSB for a sign extension, one
 *  must look to the LSB, and the same rules applies, if it's a 1, then it's a
 *  negative and if it's 0 then it's a positive number.
 * @param threeByteBuffer {Buffer}
 *  A 3-byte buffer with only 19 bits of actual data.
 * @return {number} A signed integer.
 */
function convert19bitAsInt32 (threeByteBuffer) {
  let prefix = 0;

  if (threeByteBuffer[2] & 0x01 > 0) {
    // console.log('\t\tNegative number')
    prefix = 0b1111111111111;
  }

  return (prefix << 19) | (threeByteBuffer[0] << 16) | (threeByteBuffer[1] << 8) | threeByteBuffer[2];
}

/**
 * Called to when a compressed packet is received.
 * @param buffer {Buffer} Just the data portion of the sample. So 18 bytes.
 * @return {Array} - An array of deltas of shape 2x4 (2 samples per packet
 *  and 4 channels per sample.)
 * @private
 */
function decompressDeltas18Bit (buffer) {
  let D = new Array(kOBCIGanglionSamplesPerPacket); // 2
  D[0] = [0, 0, 0, 0];
  D[1] = [0, 0, 0, 0];

  let receivedDeltas = [];
  for (let i = 0; i < kOBCIGanglionSamplesPerPacket; i++) {
    receivedDeltas.push([0, 0, 0, 0]);
  }

  let miniBuf;

  // Sample 1 - Channel 1
  miniBuf = new Buffer(
    [
      (buffer[0] >> 6),
      ((buffer[0] & 0x3F) << 2) | (buffer[1] >> 6),
      ((buffer[1] & 0x3F) << 2) | (buffer[2] >> 6)
    ]
  );
  receivedDeltas[0][0] = convert18bitAsInt32(miniBuf);

  // Sample 1 - Channel 2
  miniBuf = new Buffer(
    [
      (buffer[2] & 0x3F) >> 4,
      (buffer[2] << 4) | (buffer[3] >> 4),
      (buffer[3] << 4) | (buffer[4] >> 4)
    ]);
  // miniBuf = new Buffer([(buffer[2] & 0x1F), buffer[3], buffer[4] >> 2]);
  receivedDeltas[0][1] = convert18bitAsInt32(miniBuf);

  // Sample 1 - Channel 3
  miniBuf = new Buffer(
    [
      (buffer[4] & 0x0F) >> 2,
      (buffer[4] << 6) | (buffer[5] >> 2),
      (buffer[5] << 6) | (buffer[6] >> 2)
    ]);
  receivedDeltas[0][2] = convert18bitAsInt32(miniBuf);

  // Sample 1 - Channel 4
  miniBuf = new Buffer(
    [
      (buffer[6] & 0x03),
      buffer[7],
      buffer[8]
    ]);
  receivedDeltas[0][3] = convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 1
  miniBuf = new Buffer(
    [
      (buffer[9] >> 6),
      ((buffer[9] & 0x3F) << 2) | (buffer[10] >> 6),
      ((buffer[10] & 0x3F) << 2) | (buffer[11] >> 6)
    ]);
  receivedDeltas[1][0] = convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 2
  miniBuf = new Buffer(
    [
      (buffer[11] & 0x3F) >> 4,
      (buffer[11] << 4) | (buffer[12] >> 4),
      (buffer[12] << 4) | (buffer[13] >> 4)
    ]);
  receivedDeltas[1][1] = convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 3
  miniBuf = new Buffer(
    [
      (buffer[13] & 0x0F) >> 2,
      (buffer[13] << 6) | (buffer[14] >> 2),
      (buffer[14] << 6) | (buffer[15] >> 2)
    ]);
  receivedDeltas[1][2] = convert18bitAsInt32(miniBuf);

  // Sample 2 - Channel 4
  miniBuf = new Buffer([(buffer[15] & 0x03), buffer[16], buffer[17]]);
  receivedDeltas[1][3] = convert18bitAsInt32(miniBuf);

  return receivedDeltas;
}

/**
 * Called to when a compressed packet is received.
 * @param buffer {Buffer} Just the data portion of the sample. So 19 bytes.
 * @return {Array} - An array of deltas of shape 2x4 (2 samples per packet
 *  and 4 channels per sample.)
 * @private
 */
function decompressDeltas19Bit (buffer) {
  let D = new Array(kOBCIGanglionSamplesPerPacket); // 2
  D[0] = [0, 0, 0, 0];
  D[1] = [0, 0, 0, 0];

  let receivedDeltas = [];
  for (let i = 0; i < kOBCIGanglionSamplesPerPacket; i++) {
    receivedDeltas.push([0, 0, 0, 0]);
  }

  let miniBuf;

  // Sample 1 - Channel 1
  miniBuf = new Buffer(
    [
      (buffer[0] >> 5),
      ((buffer[0] & 0x1F) << 3) | (buffer[1] >> 5),
      ((buffer[1] & 0x1F) << 3) | (buffer[2] >> 5)
    ]
  );
  receivedDeltas[0][0] = convert19bitAsInt32(miniBuf);

  // Sample 1 - Channel 2
  miniBuf = new Buffer(
    [
      (buffer[2] & 0x1F) >> 2,
      (buffer[2] << 6) | (buffer[3] >> 2),
      (buffer[3] << 6) | (buffer[4] >> 2)
    ]);
  // miniBuf = new Buffer([(buffer[2] & 0x1F), buffer[3], buffer[4] >> 2]);
  receivedDeltas[0][1] = convert19bitAsInt32(miniBuf);

  // Sample 1 - Channel 3
  miniBuf = new Buffer(
    [
      ((buffer[4] & 0x03) << 1) | (buffer[5] >> 7),
      ((buffer[5] & 0x7F) << 1) | (buffer[6] >> 7),
      ((buffer[6] & 0x7F) << 1) | (buffer[7] >> 7)
    ]);
  receivedDeltas[0][2] = convert19bitAsInt32(miniBuf);

  // Sample 1 - Channel 4
  miniBuf = new Buffer(
    [
      ((buffer[7] & 0x7F) >> 4),
      ((buffer[7] & 0x0F) << 4) | (buffer[8] >> 4),
      ((buffer[8] & 0x0F) << 4) | (buffer[9] >> 4)
    ]);
  receivedDeltas[0][3] = convert19bitAsInt32(miniBuf);

  // Sample 2 - Channel 1
  miniBuf = new Buffer(
    [
      ((buffer[9] & 0x0F) >> 1),
      (buffer[9] << 7) | (buffer[10] >> 1),
      (buffer[10] << 7) | (buffer[11] >> 1)
    ]);
  receivedDeltas[1][0] = convert19bitAsInt32(miniBuf);

  // Sample 2 - Channel 2
  miniBuf = new Buffer(
    [
      ((buffer[11] & 0x01) << 2) | (buffer[12] >> 6),
      (buffer[12] << 2) | (buffer[13] >> 6),
      (buffer[13] << 2) | (buffer[14] >> 6)
    ]);
  receivedDeltas[1][1] = convert19bitAsInt32(miniBuf);

  // Sample 2 - Channel 3
  miniBuf = new Buffer(
    [
      ((buffer[14] & 0x38) >> 3),
      ((buffer[14] & 0x07) << 5) | ((buffer[15] & 0xF8) >> 3),
      ((buffer[15] & 0x07) << 5) | ((buffer[16] & 0xF8) >> 3)
    ]);
  receivedDeltas[1][2] = convert19bitAsInt32(miniBuf);

  // Sample 2 - Channel 4
  miniBuf = new Buffer([(buffer[16] & 0x07), buffer[17], buffer[18]]);
  receivedDeltas[1][3] = convert19bitAsInt32(miniBuf);

  return receivedDeltas;
}

/**
 * The default route when a ByteId is not recognized.
 * @param data {Buffer}
 * @private
 */
function _processOtherData(data) {
 console.log('OtherData <<< ', data);
}

/**
 * Process an uncompressed packet of data.
 * @param data {Buffer}
 *  Data packet buffer from noble.
 * @private
 */
function _processUncompressedData(data) {
  let start = 1;

  // Resets the packet counter back to zero
  packetCounter = kOBCIGanglionByteIdUncompressed;  // used to find dropped packets
  for (let i = 0; i < 4; i++) {
    _decompressedSamples[0][i] = interpret24bitAsInt32(data, start);  // seed the decompressor
    start += 3;
  }

  const newSample = _buildSample(0, _decompressedSamples[0]);
  /**
   * TODO: DO SOMETHING WITH NEW SAMPLE
   */
  // IN NODE WE DO: this.emit(k.OBCIEmitterSample, newSample);
  console.log('uncompressed sample', newSample);
}

function interpret24bitAsInt32 (byteArray, index) {
  // little endian
  var newInt = (
    ((0xFF & byteArray[index]) << 16) |
    ((0xFF & byteArray[index + 1]) << 8) |
    (0xFF & byteArray[index + 2])
  );
  if ((newInt & 0x00800000) > 0) {
    newInt |= 0xFF000000;
  } else {
    newInt &= 0x00FFFFFF;
  }
  return newInt;
}