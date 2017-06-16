var Service, Characteristic;
var request = require("request");


const COOKER_ENDPOINT = (id, secretKey, requestKey) => (
  `https://api.anovaculinary.com/cookers/${encodeURIComponent(id)}?secret=${secretKey}&requestKey=${requestKey}`
);

const JOBS_ENDPOINT = (id, secretKey, requestKey) => (
  `https://api.anovaculinary.com/cookers/${encodeURIComponent(id)}/jobs?secret=${secretKey}&requestKey=${requestKey}`
);

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-anova", "AnovaCooker", AnovaCooker);
};

function AnovaCooker(log, config) {

	this.log = log;
	//Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
	//Characteristic.TemperatureDisplayUnits.FAHRENHEIT = 1;
	this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
	this.maxTemp = this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 99 : 210;
	this.minTemp = this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 25 : 77;
	this.name = config.name;
	this.cooker = config.cooker || null;
	this.secret = config.secret || null;

	this.currentTemperature = this.minTemp;
	// The value property of CurrentHeatingCoolingState must be one of the following:
	//Characteristic.CurrentHeatingCoolingState.OFF = 0;
	//Characteristic.CurrentHeatingCoolingState.HEAT = 1;
	//Characteristic.CurrentHeatingCoolingState.COOL = 2;
	this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
	this.targetTemperature = this.minTemp;
	// The value property of TargetHeatingCoolingState must be one of the following:
	//Characteristic.TargetHeatingCoolingState.OFF = 0;
	//Characteristic.TargetHeatingCoolingState.HEAT = 1;
	//Characteristic.TargetHeatingCoolingState.COOL = 2;
	//Characteristic.TargetHeatingCoolingState.AUTO = 3;
	this.targetHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

	this.service = new Service.Thermostat(this.name);

}

AnovaCooker.prototype = {
	//Start
	identify: function(callback) {
		this.log("Identify requested!");
		callback(null);
	},
	getName: function(callback) {
		this.log("getName :", this.name);
		var error = null;
		callback(error, this.name);
	},
	getServices: function() {

		function syncLocalData(json, obj){

			var unit = json.status.temp_unit == 'c' ? Characteristic.TemperatureDisplayUnits.CELSIUS : Characteristic.TemperatureDisplayUnits.FAHRENHEIT;

			obj.temperatureDisplayUnits = unit;
			obj.maxTemp = obj.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 99 : 210;
			obj.minTemp = obj.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS ? 25 : 77;

			obj.currentTemperature = json.status.current_temp ? json.status.current_temp :  obj.minTemp;
			obj.targetTemperature = json.status.target_temp ? json.status.target_temp :  obj.minTemp;


			if(json.status.is_running){

				if(obj.currentTemperature < obj.targetTemperature ){
					obj.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;
					obj.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT;
				}
				else{
					obj.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.COOL;
					obj.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
				}

			}
			else{
				obj.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.COOL;
				obj.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.COOL;
			}

			

		}


		function setTargetHeatingCoolingState(value) {

			if(value == Characteristic.TargetHeatingCoolingState.COOL || value == Characteristic.TargetHeatingCoolingState.OFF ){
				return "{ is_running: false }";
			}

			return "{ is_running: true }";
		}

		function setTargetTemperature(value) {
			return "{ target_temp: ${value} }";
		}

		function setTemperatureDisplayUnits(value) {
			return value == Characteristic.TemperatureDisplayUnits.CELSIUS ? "{ temp_unit: 'c' }" : "{ temp_unit: 'f' }";
		}
		
		var getDispatch = function (callback, characteristic){

			var value = 0;
			var actionName = "get" + characteristic.displayName.replace(/\s/g, '');
			var requestKey = new Date().valueOf();


			request.get({ url: COOKER_ENDPOINT(this.cooker, this.secret, requestKey)}, function (err, response, body) {
				
				if (!err && response.statusCode == 200) {

								
					var json = JSON.parse(body);

					syncLocalData(json, this);


					switch (actionName) {
						case "getCurrentHeatingCoolingState": value = this.heatingCoolingState; break;
						case "getTargetHeatingCoolingState": value = this.targetHeatingCoolingState; break;
						case "getCurrentTemperature": value = this.currentTemperature; break;
						case "getTargetTemperature": value = this.targetTemperature; break;
						case "getTemperatureDisplayUnits": value = this.temperatureDisplayUnits; break;
						default: value = 0;
					}						

				}
				else
				{
					switch (actionName) {
						case "getCurrentHeatingCoolingState": value = Characteristic.CurrentHeatingCoolingState.OFF; break;
						case "getTargetHeatingCoolingState": value = Characteristic.TargetHeatingCoolingState.OFF; break;
						case "getCurrentTemperature": value = this.minTemp; break;
						case "getTargetTemperature": value = this.minTemp; break;
						case "getTemperatureDisplayUnits": value = this.temperatureDisplayUnits; break;
						default: value = 0;
					}
				}

				this.log("getDispatch: ", actionName + ":", value);
				callback(null, value);

			}.bind(this));

			

		}.bind(this);

		var setDispatch = function (value, callback, characteristic) {

			var actionName = "set" + characteristic.displayName.replace(/\s/g, '');
			this.log("setDispatch: " + actionName + ":", value);

			var body = [];

			switch (actionName) {
				case "setTargetHeatingCoolingState": body = setTargetHeatingCoolingState(value); break;
				case "setTargetTemperature": body = setTargetTemperature(value); break;
				case "setTemperatureDisplayUnits": body = setTemperatureDisplayUnits(value); break;
				default:
			}
			
			request.post({ 
				url: COOKER_ENDPOINT(this.cooker, this.secret, new Date().valueOf()), 
				headers: { 'Content-Type': 'application/json' },
	        	body: JSON.stringify(body)
	        }, function (err, response, body) {

	        	if (!err && response.statusCode == 200) {
						
						var json = JSON.parse(body);

						syncLocalData(json, this);
				}

				
				callback(null, value);

			}.bind(this));

		}.bind(this);

		function makeHelper(characteristic) {

			return {
				getter: function (callback) { getDispatch(callback, characteristic); },
				setter: function (value, callback) { setDispatch(value, callback, characteristic) }
			};
		}


		// you can OPTIONALLY create an information service if you wish to override
		// the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Anovaculinary.com")
			.setCharacteristic(Characteristic.Model, "Anova Precision Cooker")
			.setCharacteristic(Characteristic.SerialNumber, this.cooker);


		var counters = [];

		this.service.addCharacteristic(Characteristic.LockManagementAutoSecurityTimeout);

		// Bind Characteristics
		for (var characteristicIndex in this.service.characteristics) 
		{
			var characteristic = this.service.characteristics[characteristicIndex];
			var compactName = characteristic.displayName.replace(/\s/g, '');

			if(compactName == 'Name'){
				continue;
			}

			this.log("makeHelper: ", compactName);

			counters[characteristicIndex] = makeHelper(characteristic);
			characteristic.on('get', counters[characteristicIndex].getter.bind(this));
			characteristic.on('set', counters[characteristicIndex].setter.bind(this));

			if(compactName.indexOf("Temperature")){
				characteristic.props.maxValue = 99;
			}


		}


		return [informationService, this.service];
	}
};

