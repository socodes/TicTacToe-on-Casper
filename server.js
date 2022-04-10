const express = require('express');
var cors = require('cors');
const { RuntimeArgs, CLValueBuilder, Contracts, CasperClient,DeployUtil,CLPublicKey} = require('casper-js-sdk');
const res = require('express/lib/response');
const app = express();
const port = 3000;

const client = new CasperClient("http://3.208.91.63.7777/rpc");
const contract = new Contracts.Contract(client);
contract.setContractHash("hash-fe81eb69993e4ab43bd1ee1b56bf166152d535dd29bc2a2549fbbbf4c1240e00");

app.use(express.static(__dirname + 'public/static'))
app.use(cors());
app.use(express.json())

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
}); 

app.get('/', (req, res) => {
    res.sendFile('public/index.html',{root: __dirname})
});

app.post('/sendDeploy',(req, res) => {
    const signedJSON = req.body;
    let signedDeploy = DeployUtil.deployFromJson(signedJSON).unwrap();
    signedDeploy.send("http://3.208.91.63.7777/rpc").then((response) => {
        res.send(response);
        return;
    }).catch((error) => {
        console.log(error);
        return;
    })
})

app.get("/getDeploy",(req,res) => {
    const hash = req.query.hash;
    client.getDeploy(hash).then((response) => {
        res.send(response[1].execution_result); 
    }).catch((error) => {
        res.send(error);
    })
})


app.get("getHighscore",(req,res) => {
    const account = req.query.hash;
    contract.queryContractDictionary("highscore_dictionary",CLPublicKey.fromHex(account).toAccountHashStr().substring(13)).then((response) => {
        res.send(response.data);
    }).catch((error) => {
        res.send(error);
        return;
    })
})