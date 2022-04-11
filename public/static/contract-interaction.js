const { Signer } = require("casper-client-sdk");
const { Contracts } = require("casper-js-sdk");

const client = new CasperClient("http://3.208.91.63.7777/rpc");
const contract = new Contracts.Contract(client);
var activeKey = null;
var button = document.getElementById("button");
var getDeployInterval = null;
var highscore = null;

if(Signer.isConnected()) {
    button.textContent = "Publish"
}

function sendConnectionRequest() {
    Signer.sendConnectionRequest()
}

async function createDeploy() {
    if(activeKey == null) {
        alert("Your signer is locked or not connected");
        return;
    }

    if(score == 0){
        alert("Your score cannot be zero");
        return;
    }
    if(highscore != null && score < highscore) {
        alert("Your score may not be less than your highscore");
    }

    const args = RuntimeArgs.fromMap({'score': CLValueBuilder.u512(score) });
    const pubkey = CLPublicKey.fromHex(activeKey);
    contract.setContractHash("hash-fe81eb69993e4ab43bd1ee1b56bf166152d535dd29bc2a2549fbbbf4c1240e00")
    const result = contract.callEntrypoint("add_highscore",args,pubkey,"casper-test",csprToModes(1).toString(), [], 10000000);
    const deployJSON = DeployUtil.deployToJson(result);
    Signer.sign(deployJSON, activeKey).then((success) => {
        sendDeploy(success)
    }).catch((error) => {
        console.log(error);
    });

}

function sendDeploy(signedDeployJSON) {
    axios.post("/sendDeploy",signedDeployJSON, {
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        const hash = response.data;
        updateStatus("Deployed, <a target='_blank' href='https://testnet.cspr.live/deploy/" + hash + "'>View on cspr.live</a>");
        inititateGetDeployProcedure(hash);
    }).catch((error) => {
        alert(error);
    })
}
function inititateGetDeployProcedure(hash) {
    animateStatusByAppending("Waiting for execution");
    getDeploy(hash);
    getDeployInterval = setInterval(() => {
        getDeploy(hash);
    }, 5000);
}

async function getDeploy(deployHash) {
    axios.get("/getDeploy", {
        params: {
            hash: deployHash
        }
    }, {
        headers: {
            "Content-Type": "application/json",

        }
    }).then(response => {
        if(response.data.length == 0) {
            console.log("No return data yet");
            return;
        }
        const executionResults = response.data[0]

        if(!executionResults.hasownProperty("result")) {
            console.log("Does not have result yet");
            return;
        }

        const result = executionResults.result;

        if (result.hasOwnProperty("Success")) {
            stopAnimation("Deployment Successful","#2A9944")
            getHighscore(activeKey)
        }else if(result.hasOwnProperty("Failure")) {
            stopAnimation("Deployment Failure: "+result.Failure.error_message,"#F50102")
        }
        else{
            console.log("Lets see if it is happen.")
        }
        clearInterval(getDeployInterval)
    }).catch((error) => {
        alert("Error");
        stopAnimation("Error Deploying","#CF000F")
        clearInterval(getDeployInterval);
    })
}
async function getHighscore(pubkey) {
    axios.get("/getHighscore",{
        params:{
            hash:pubkey,
        }
    }).then((response) => {
        setHighscore(parseInt(response.data.hex, 16))
    }).catch(error => {
        alert(error);
    })
}

async function buttonPressed() {
    const isConnected = await Signer.isConnected();
    if( isconnected ) {
        if(activeKey == null) {
            try{
                activeKey = await Signer.getActivePublicKey();
            }catch(e){
                alert(e)
            }
            setActiveKeyLabel(activeKey);
            button.textContent = "Publish";
        }else {
            createDeploy();
        }
    }else {
        sendSign();
    }
}