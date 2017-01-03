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
      //Changes button classe when successful
      connect_button.className = "btn btn-success connected";
      connect_button.innerText = "Disconnect Ganglion";
      console.log('Connected to ' + gang_name);
    })
    .catch(error => { console.log(error); });
  } else {
    disconnectFromServices()
    .then(_ => {
      //Changes button classe when successful
      connect_button.className = "btn btn-primary disconnected";
      connect_button.innerText = "Connect to Ganglion";
      console.log('Ganglion has been disconnected');
    });
  };
});

read_button.addEventListener('click', function(event){
  read_button.className = "btn btn-success on";
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
    receive_characteristic = characteristics.find(char => char.uuid === '2d30c082-f39f-4ce6-923f-3484ea480596');
    send_characteristic = characteristics.find(char => char.uuid === '2d30c083-f39f-4ce6-923f-3484ea480596');
    disconnect_characteristic = characteristics.find(char => char.uuid === '2d30c084-f39f-4ce6-923f-3484ea480596');
  })
};

function disconnectFromServices(){
  var disconnect_signal = new Uint8Array([1]);
  return disconnect_characteristic.writeValue(disconnect_signal)
  .catch(error => { console.log(error); });
};
