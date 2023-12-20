// export const OWNER_KEY = "OWNER";
// export const USER_KEY_PREFIX = "USER:";
// export const ORG_KEY_PREFIX = "ORG:";
// export const USER_MAPPER_KEY = "USER_MAPPER";
// export const ORG_MAPPER_KEY = "ORG_MAPPER";
// export const ORG_SUBSCRIBER_KEY = "ORG_SUBSCRIBER_KEY";

export const KEYS = {
  IS_INITIALIZED: "INIT",
  OWNER: "OWNER",
  USER_KEY_PREFIX: "USER:",
  ORG_KEY_PREFIX: "ORG:",
  DATASET_TO_CHANNELS: "DTC",
  CHANNEL_TO_PUBS: "CTP",
  CHANNEL_TO_SUBS: "CTS",
};

export const PERMISSIONS = {
  WRITE: 0x001,
  READ: 0x010,
  DELETE: 0x100,
};

export const TRUE = Buffer.from("TRUE");
export const FALSE = Buffer.from("FALSE");

/**
 * @param USER_MAPPER
 * A key points to a json object which contains all users registered in this organization
 * e.g. { userId: <User> }
 */

/**
 * @param SUBSCRIBERS
 * A key points to a json object which contains all organizations subscribe to current organization
 * e.g. [org2, org3]
 */
