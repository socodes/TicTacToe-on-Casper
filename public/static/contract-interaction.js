

const client = new CasperClient("http://3.208.91.63:7777/rpc");
const contract = new Contracts.Contract(client);
var activeKey = null;
var button = document.getElementById("button");
var getDeployInterval = null;
var highscore = null;

if (Signer.isConnected()) { //If Signer is connected, change button test from "Connect" to "Publish"
  button.textContent = "Publish";
}

function sendSign() {
  Signer.sendConnectionRequest(); //Initiates Signer Connection
}

async function createDeploy() {
  if (activeKey == null) { //Need to be connected to the Signer to continue
    alert("Please unlock the signer to continue");
    return;
  }

  if (score == 0) {
    alert("Your score may not be zero");
    return;
  }

  console.log(highscore);

  if (highscore != null && score < highscore) {
    alert("Your score may not be less than your highscore");
    return;
  }

  const args = RuntimeArgs.fromMap({ 'score': CLValueBuilder.u512(score) }); //Need to build a UInt512 CLValue and package into RuntimeArgs
  const pubkey = CLPublicKey.fromHex(activeKey); //Build CLPublicKey from hex representation of public key
  contract.setContractHash("hash-75143aa704675b7dead20ac2ee06c1c3eccff4ffcf1eb9aebb8cce7c35648041"); //Sets the contract hash of the Contract instance. The hash of our highscore contract
  const result = contract.callEntrypoint("add_highscore", args, pubkey, "casper-test", csprToMotes(1).toString(), [], 10000000); //Builds a Deploy object at add_highscore entrypoint
  const deployJSON = DeployUtil.deployToJson(result);
  Signer.sign(deployJSON, activeKey).then((success) => { //Initiates sign request
    sendDeploy(success);
  }).catch((error) => {
    console.log(error);
  });
}

function sendDeploy(signedDeployJSON) {
  axios.post("/sendDeploy", signedDeployJSON, { //Sends request to /sendDeploy endpoint in server.js. Need to send deployment from the backend do to CORS policy.
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    const hash = response.data;
    updateStatus("Deployed. <a target='_blank' href='https://testnet.cspr.live/deploy/" + hash + "'>View on cspr.live</a>");
    initiateGetDeployProcedure(hash);
  }).catch((error) => {
    alert(error);
  });
}

function initiateGetDeployProcedure(hash) {
  animateStatusByAppending("Waiting for execution");
  getDeploy(hash);
  getDeployInterval = setInterval(() => { //We call this every 5 seconds to check on the status of the deploy
    getDeploy(hash);
  }, 5000);
}

async function getDeploy(deployHash) {
  axios.get("/getDeploy", { //Sends request to /getDeploy endpoint in server.js.
    params: {
      hash: deployHash,
    }
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    //response.data[0] == execution_results {...}
    if (response.data.length == 0) { //See if there's return data yet
      console.log("No return data yet");
      return;
    }

    const executionResults = response.data[0];

    if (!executionResults.hasOwnProperty("result")) { //If executionResults doesn't contain the result key the deployment hasn't been executed by the node
      console.log("Doesnt have result yet");
      return;
    }

    const result = executionResults.result; //Get the result
    console.log(response.data);

    if (result.hasOwnProperty("Success")) { //Deployment succeeded!
      console.log("Success!");
      stopAnimation("Deployment Successful", "#2A9944");
      getHighscore(activeKey);
      console.log("Execution Successful")
    } else if (result.hasOwnProperty("Failure")) {
      stopAnimation("Deployment Failure: " + result.Failure.error_message, "#F50102");
      console.log("Execution Failure");
    } else {
      stopAnimation("Unknown Error, result not containing Success or Failure", "#F50102");
      console.log("Unknown Error");
    }
    clearInterval(getDeployInterval); //Stop polling getDeploy

  }).catch((error) => {
    alert(error);
    stopAnimation("Error deploying", "#CF000F");
    clearInterval(getDeployInterval); //Stop polling getDeploy
  });
}

async function getHighscore(pubkey) {
  axios.get("/getHighscore", { //Sends request to /getHighscore endpoint in server.js
    params: {
      hash: pubkey,
    }
  }).then((response) => {
    setHighscore(parseInt(response.data.hex, 16));
  }).catch((error) => {
    alert("Could not get highscore");
  });
}

async function buttonPressed() {
  const isConnected = await Signer.isConnected();
  if (isConnected) {
    if (activeKey == null) { //If activeKey == null get the current public key from Signer.
      try {
        activeKey = await Signer.getActivePublicKey();
      } catch (error) {
        alert(error);
      }
      setActiveKeyLabel(activeKey);
      button.textContent = "Publish";
    } else {
      createDeploy();
    }

  } else {
    sendSign();
  }
}

/* EVENT LISTENERS */
/* FIRE WHEN SIGNER STATE CHANGES */

window.addEventListener("signer:locked", (msg) => {
  setActiveKeyLabel("Not Connected");
  activeKey = null;
});
window.addEventListener("signer:unlocked", (msg) => {
  if (msg.detail.isConnected) {
    recentlyConnected(msg.detail.activeKey);
    button.textContent = "Publish";
  }
});
window.addEventListener("signer:activeKeyChanged", (msg) => {
  if (msg.detail.isConnected) {
    recentlyConnected(msg.detail.activeKey);
  }
});
window.addEventListener("signer:connected", (msg) => {
  recentlyConnected(msg.detail.activeKey);
  button.textContent = "Publish";
});
window.addEventListener("signer:disconnected", (msg) => {
  setActiveKeyLabel("Not Connected");
  activeKey = null;
  button.textContent = "Connect";
});

function recentlyConnected(pubkey) {
  activeKey = pubkey;
  setActiveKeyLabel(pubkey);
  getHighscore(pubkey);
}


function setActiveKeyLabel(address) {
  document.getElementById("connected-account").textContent = "Connected Account: " + address;
}

function csprToMotes(cspr) {
  return cspr * 10**9;
}
