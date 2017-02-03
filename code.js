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
  .then(_ =>{
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
  console.log('Received ' + value);
  // TODO: Parse Heart Rate Measurement value.
  // See https://github.com/WebBluetoothCG/demos/blob/gh-pages/heart-rate-sensor/heartRateSensor.js
};

function processBytes(data) {
  let byteID = parseInt(data[0]);
  if (byteID <= 200) {  //ByteID Max = 200
    this.processProcessSampleData(data);
  }
};
