import * as dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";

import * as grpc from "@grpc/grpc-js";
import {
  connect,
  Contract,
  Identity,
  Signer,
  signers,
} from "@hyperledger/fabric-gateway";
import * as crypto from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import { TextDecoder } from "util";

import { envOrDefault } from "./utils";

const utf8Decoder = new TextDecoder();

const WRITE = 0x001;
const READ = 0x010;
const DELETE = 0x100;

const METHOD_MAPPER: { [key: string]: string } = {
  initContract: "init",
  transferOwnershipTo: "transferOwnershipTo",
  addOrg: "addOrg",
  updateOrgName: "updateOrgName",
  updateOrgAccess: "updateOrgAccess",
  updateOrgDatasetAccess: "updateOrgDatasetAccess",
  removeOrg: "removeOrg",
  addUser: "addUser",
  publishDatasetTo: "publishDatasetTo",
  subscribe: "subscribe",
  queryAccessOnDataset: "queryAccessOnDataset",
  owner: "owner",
  getOrg: "getOrg",
};

class Controller {
  channelName: string = envOrDefault("CHANNEL_NAME", "mychannel");
  chaincodeName: string = envOrDefault("CHAINCODE_NAME", "test2");
  mspId: string = envOrDefault("MSP_ID", "Org1MSP");

  fabricHome: string = process.env.FABRIC_HOME!;
  cryptoPath: string = envOrDefault(
    "CRYPTO_PATH",
    path.resolve(
      this.fabricHome,
      "test-network",
      "organizations",
      "peerOrganizations",
      "org1.example.com"
    )
  );
  keyDirectoryPath: string = envOrDefault(
    "KEY_DIRECTORY_PATH",
    path.resolve(
      this.cryptoPath,
      "users",
      "User1@org1.example.com",
      "msp",
      "keystore"
    )
  );
  // Path to user certificate.
  certPath: string = envOrDefault(
    "CERT_PATH",
    path.resolve(
      this.cryptoPath,
      "users",
      "User1@org1.example.com",
      "msp",
      "signcerts",
      "User1@org1.example.com-cert.pem"
    )
  );
  // Path to peer tls certificate.
  tlsCertPath: string = envOrDefault(
    "TLS_CERT_PATH",
    path.resolve(
      this.cryptoPath,
      "peers",
      "peer0.org1.example.com",
      "tls",
      "ca.crt"
    )
  );
  // Gateway peer endpoint.
  peerEndpoint: string = envOrDefault("PEER_ENDPOINT", "localhost:7051");
  // Gateway peer SSL host name override.
  peerHostAlias: string = envOrDefault(
    "PEER_HOST_ALIAS",
    "peer0.org1.example.com"
  );

  contract: Contract | undefined | null;
  constructor({ _mspId }: { _mspId: string }) {
    if (_mspId === "Org1MSP") {
      this.mspId = "Org1MSP";
      this.cryptoPath = path.resolve(
        this.fabricHome,
        `test-network/organizations/peerOrganizations/org1.example.com`
      );
      this.keyDirectoryPath = path.resolve(
        this.cryptoPath,
        "users",
        "User1@org1.example.com",
        "msp",
        "keystore"
      );
      this.certPath = path.resolve(
        this.cryptoPath,
        "users",
        "User1@org1.example.com",
        "msp",
        "signcerts",
        "User1@org1.example.com-cert.pem"
      );
      this.tlsCertPath = path.resolve(
        this.cryptoPath,
        "peers",
        "peer0.org1.example.com",
        "tls",
        "ca.crt"
      );
      this.peerEndpoint = envOrDefault("PEER_ENDPOINT", "localhost:7051");
      this.peerHostAlias = envOrDefault(
        "PEER_HOST_ALIAS",
        "peer0.org1.example.com"
      );
    } else if (_mspId === "Org2MSP") {
      this.mspId = "Org2MSP";
      this.cryptoPath = path.resolve(
        this.fabricHome,
        `test-network/organizations/peerOrganizations/org2.example.com`
      );
      this.keyDirectoryPath = path.resolve(
        this.cryptoPath,
        "users",
        "User1@org2.example.com",
        "msp",
        "keystore"
      );
      this.certPath = path.resolve(
        this.cryptoPath,
        "users",
        "User1@org2.example.com",
        "msp",
        "signcerts",
        "User1@org2.example.com-cert.pem"
      );
      this.tlsCertPath = path.resolve(
        this.cryptoPath,
        "peers",
        "peer0.org2.example.com",
        "tls",
        "ca.crt"
      );
      this.peerEndpoint = envOrDefault("PEER_ENDPOINT", "localhost:9051");
      this.peerHostAlias = envOrDefault(
        "PEER_HOST_ALIAS",
        "peer0.org2.example.com"
      );
    }
    console.log(`--------------- Parameters ---------------`);
    console.log(`channelName:       ${this.channelName}`);
    console.log(`chaincodeName:     ${this.chaincodeName}`);
    console.log(`mspId:             ${this.mspId}`);
    console.log(`cryptoPath:        ${this.cryptoPath}`);
    console.log(`keyDirectoryPath:  ${this.keyDirectoryPath}`);
    console.log(`certPath:          ${this.certPath}`);
    console.log(`tlsCertPath:       ${this.tlsCertPath}`);
    console.log(`peerEndpoint:      ${this.peerEndpoint}`);
    console.log(`peerHostAlias:     ${this.peerHostAlias}`);
    console.log("------------------------------------------");
  }

  async displayInputParameters() {
    return {
      channelName: this.channelName,
      chaincodeName: this.chaincodeName,
      cryptoPath: this.cryptoPath,
      keyDirectoryPath: this.keyDirectoryPath,
      certPath: this.certPath,
      tlsCertPath: this.tlsCertPath,
      peerEndpoint: this.peerEndpoint,
      peerHostAlias: this.peerHostAlias,
    };
  }
  async getNewGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(this.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(this.peerEndpoint, tlsCredentials, {
      "grpc.ssl_target_name_override": this.peerHostAlias,
    });
  }
  async getNewIdentity(): Promise<Identity> {
    const credentials = await fs.readFile(this.certPath);
    return { mspId: this.mspId, credentials };
  }
  async getNewSigner(): Promise<Signer> {
    const files = await fs.readdir(this.keyDirectoryPath);
    const keyPath = path.resolve(this.keyDirectoryPath, files[0]);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }
  async initialize() {
    const client = await this.getNewGrpcConnection();
    const gateway = connect({
      client,
      identity: await this.getNewIdentity(),
      signer: await this.getNewSigner(),
      evaluateOptions: () => {
        return { deadline: Date.now() + 5000 }; // 5 seconds
      },
      endorseOptions: () => {
        return { deadline: Date.now() + 15000 }; // 15 seconds
      },
      submitOptions: () => {
        return { deadline: Date.now() + 5000 }; // 5 seconds
      },
      commitStatusOptions: () => {
        return { deadline: Date.now() + 60000 }; // 1 minute
      },
    });
    const network = gateway.getNetwork(this.channelName);
    // Get the smart contract from the network.
    this.contract = network.getContract(this.chaincodeName)!;
    return this.contract;
  }

  toJson(payload: string) {
    try {
      return JSON.parse(payload);
    } catch (e) {
      return payload;
    }
  }

  async contractCall(funcName: string, args: Array<any>) {
    const _funcName = METHOD_MAPPER[funcName];
    console.log(`Invoking method '${_funcName}' on the chain ...`);
    await this.contract.submitTransaction(_funcName, ...args);
  }
  async contractQuery(funcName: string, args: Array<any>) {
    const resultBytes = await this.contract.evaluateTransaction(
      funcName,
      ...args
    );
    const resultJson = utf8Decoder.decode(resultBytes);
    console.log(`${funcName}: ${resultJson}`, typeof resultJson, resultJson);
    return this.toJson(resultJson);
  }
}

const app: Express = express();

const PORT = process.env.PORT || 18000;

app.use(express.json());

const controllers: { [key: string]: any } = {
  Org1MSP: new Controller({ _mspId: "Org1MSP" }),
  Org2MSP: new Controller({ _mspId: "Org2MSP" }),
};

app.listen(PORT, async () => {
  for (const controller of Object.values(controllers)) {
    await controller.initialize();
  }
  console.log(`Server is running at ::${PORT}`);
});

// app.get("/health", async (req, res) => {
//   try {
//     return res.json({ status: "success" });
//   } catch (err) {
//     return res.json({ status: "fail" });
//   }
// });

app.post("/call", async (req, res) => {
  try {
    const { funcName, args = [], mspId } = req.body;
    console.log("funName:", funcName);
    console.log("args:", args, typeof args);
    console.log("mspId:", mspId);

    await controllers[mspId].contractCall(
      funcName as string,
      args as Array<string>
    );
    return res.json({ status: "success" });
  } catch (err) {
    console.log(err);
    return res.json({ status: "fail", msg: err?.details[0]?.message });
  }
});

app.post("/query", async (req, res) => {
  try {
    const { funcName, args = [], mspId } = req.body;
    console.log("funName:", funcName);
    console.log("args:", args, typeof args);
    console.log("mspId:", mspId);

    const resp = await controllers[mspId].contractQuery(
      funcName as string,
      args as Array<string>
    );
    console.log("resp: ", resp);
    // if (typeof resp === "string") {
    //   const ret = { status: "success" };
    //   ret[funcName] = resp;
    //   return res.json(ret);
    // } else {
    return res.json({ status: "success", data: resp });
    // }
  } catch (err) {
    console.log(err);
    return res.json({ status: "fail", msg: err?.details[0]?.message });
  }
});

export const PERMISSIONS = {
  WRITE: 0x001,
  READ: 0x010,
  DELETE: 0x100,
};

app.get("/dataset", async (req, res) => {
  try {
    const query = req.query;
    const respList = await controllers["Org1MSP"].contractQuery(
      "queryAccessOnDataset",
      [query.userId, query.dataset]
    );

    let link: string;
    for (const resp of respList) {
      if (resp.access & 0x010) {
        link = resp.location;
        break;
      }
    }

    if (link) {
      return res.json({ status: "success", location: link });
    } else {
      res.status(403);
      return res.json({ status: "success", msg: "No Permission" });
    }
  } catch (err) {
    console.log(err);
    return res.json({ status: "fail", msg: err?.details[0]?.message });
  }
});
