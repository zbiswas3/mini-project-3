//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4

//update function to take in text input from the app and add the note for the latest weight observation annotation
//you should include text and the author can be set to anything of your choice. keep in mind that this data will
// be posted to a public sandbox
function weightChart(weight) {
    var points = [];
    weight.forEach(w => {
      var date = new Date(w.effectiveDateTime);
      var num = Number(parseFloat((w.valueQuantity.value)).toFixed(2))
      points.push({x: date, y: num})
      });
  var chart = new CanvasJS.Chart("chartContainer", {
    animationEnabled: true,
    theme: "dark1",
    title:{
      text: "Weight Over Time"
    },
    data: [{        
      type: "line",
          indexLabelFontSize: 16,
      dataPoints: points
    }]
  }); 

  chart.render();  
}


// calculate the risk of CHD in a patient 
function riskCalc(pt){
  var gChol;
  var cholesterol;
  var hdlc;
  if (typeof pt.hdl != 'undefined'){
    console.log(typeof pt.hdl + "  //  "+ pt.hdl)
    hdlc = String(pt.hdl).match(/\d+[\W]\d*/g)[0];
  } else hdlc = 'undefined';

  console.log("hdlc" + hdlc);


  var ldlc;
  console.log(String(pt.ldl))
  if (typeof pt.ldl != 'undefined'){
    ldlc = String(pt.ldl).match(/\d+[\W]\d*/g)[0];
  } else ldlc = 'undefined';
  console.log("ldlc" + ldlc);



  var sys = pt.sys.match(/\d+[\W]\d*/g)[0];
  var dia = pt.dia.match(/\d+[\W]\d*/g)[0];

  if (gender == "female"){
    gChol =  9.92545;
  } else {
    gChol = 3.0975;
  }
  console.log("gChol " + gChol);


  const dob = new Date(birthDate);
  var now = new Date();
  var age = (now - dob) / 31556952000;

  console.log("age  "+ age);

  if (hdlc < 35){
    hdlc = 0.49744
  } else if (hdlc <= 44){
    hdlc = 0.24310;
  } else if (hdlc <=  49){
    hdlc = 0.0;
  } else if (hdlc <= 59) {
    hdlc =  0.0-0.05107;
  }  else if (hdlc > 59) {
    hdlc =  0.0-0.48660;
  } else { hdlc = 0.0;}

  console.log("hdlc " + hdlc)

  if (ldlc < 130){
    cholesterol = 0.49744
  } else if (ldlc <= 160){
    cholesterol = 0.24310;
  }  else if (ldlc > 160) {
    cholesterol =  0.0-0.48660;
  } else { cholesterol = 0.0;}

  console.log("cholesterol " + cholesterol)

}
  
// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}


// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;

}


//helper function to get quanity and unit from an observation resoruce.
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

// helper function to get both systolic and diastolic bp
function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function(observation) {
    var BP = observation.component.find(function(component) {
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

// create a patient object to initalize the patient
function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
    note: 'No Annotation',
  };
}

//helper function to display the annotation on the index page
function displayAnnotation(annotation) {
  note.innerHTML = annotation;
}

//function to display the observation values you will need to update this
function displayObservation(obs) {
  hdl.innerHTML = obs.hdl;
  ldl.innerHTML = obs.ldl;
  sys.innerHTML = obs.sys;
  dia.innerHTML = obs.dia;
  weight.innerHTML = obs.weight;
  height.innerHTML = obs.height;
}

var birthDate;
var gender;
//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {

  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      console.log(patient);
      birthDate = patient.birthDate;
      gender = patient.gender;
    }
  );

  // get observation resoruce values
  // you will need to update the below to retrive the weight and height values
  var query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", 100);
  query.set("_sort", "-date");
  query.set("code", [
    'http://loinc.org|8462-4',
    'http://loinc.org|8480-6',
    'http://loinc.org|2085-9',
    'http://loinc.org|2089-1',
    'http://loinc.org|55284-4',
    'http://loinc.org|3141-9',
    'http://loinc.org|29463-7',
    'http://loinc.org|2339-0',
    'http://loinc.org|18262-6',
  ].join(","));

  var weightObservation;
  var systolicbp;
  var diastolicbp;
  var hdl;
  var ldl;
  var height;
  var weight;

  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function(ob) {

      // group all of the observation resoruces by type into their own
      var byCodes = client.byCodes(ob, 'code');
      systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
      diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
      hdl = byCodes('2085-9');
      // ldl = byCodes('2089-1');
      ldl = byCodes('18262-6');
      height = byCodes('2339-0');
      weight = byCodes('29463-7');
      weightObservation = weight[0]

      // create patient object
      var p = defaultPatient();

      // set patient value parameters to the data pulled from the observation resoruce
      if (typeof systolicbp != 'undefined') {
        p.sys = systolicbp;
      } else {
        p.sys = 'undefined'
      }

      if (typeof diastolicbp != 'undefined') {
        p.dia = diastolicbp;
      } else {
        p.dia = 'undefined'
      }
      
      p.height = getQuantityValueAndUnit(height[0])
      p.weight = getQuantityValueAndUnit(weight[0]) 
      p.hdl = getQuantityValueAndUnit(hdl[0]);
      p.ldl = getQuantityValueAndUnit(ldl[0]);

      console.log(p.sys.match(/\d+[\W]\d*/g) +  p.dia.match(/\d+[\W]\d*/g));

      weightChart(weight)
      displayObservation(p)
      riskCalc(p)
    });


  const getPath = client.getPath;
  const rxnorm  = "http://www.nlm.nih.gov/research/umls/rxnorm";

  function display(data) {
       JSON.stringify(data, null, 4).slice(1,-1).trim().split(",").forEach(function(index, item){
         med_list.innerHTML += "<li>" + index.trim()  + "</li>";
       });
    }
  function getMedicationName(medCodings = []) {
      var coding = medCodings.find(c => c.system === rxnorm);
      return coding && coding.display || "Unnamed Medication(TM)";
    }

  client.request("/MedicationRequest?patient=" + client.patient.id, {
        resolveReferences: "medicationReference"
    }).then(data => data.entry.map(item => getMedicationName(
        getPath(item, "resource.medicationCodeableConcept.coding") ||
        getPath(item, "resource.medicationReference.code.coding")
    ))).then(display);

  //update function to take in text input from the app and add the note for the latest weight observation annotation
  //you should include text and the author can be set to anything of your choice. keep in mind that this data will
  // be posted to a public sandbox
  function addWeightAnnotation() {
    var annotation = document.getElementById("annotation").value;
    console.log(String(weightObservation.id))
    displayAnnotation(annotation);
    var event = new Date();
    var dateString = event.toISOString().slice(0,19) + event.toString().slice(28,31)+":"+ event.toString().slice(31,33);
    var authorString = "zbiswas3";

    weightObservation.note = {'authorString': authorString,
                              'text' : annotation,
                              'time' : dateString};

    client.update(weightObservation)    
  }

  //event listner when the add button is clicked to call the function that will add the note to the weight observation
  document.getElementById('add').addEventListener('click', addWeightAnnotation);


}).catch(console.error);
