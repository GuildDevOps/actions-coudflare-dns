/**
 * Create CloudFlare DNS Record Action for GitHub
 * https://github.com/marketplace/actions/cloudflare-create-dns-record
 */

const cp = require("child_process");

const saveOutput = ({ id, name }) => {
  console.log(`echo "record_id=${id}" >> $GITHUB_OUTPUT`);
  console.log(`echo "name=${name}" >> $GITHUB_OUTPUT`);
};

const getCurrentRecordId = () => {
  //https://api.cloudflare.com/#dns-records-for-a-zone-list-dns-records
  const { status, stdout } = cp.spawnSync("curl", [
    ...["--header", `Authorization: Bearer ${process.env.INPUT_TOKEN}`],
    ...["--header", "Content-Type: application/json"],
    `https://api.cloudflare.com/client/v4/zones/${process.env.INPUT_ZONE}/dns_records`,
  ]);

  if (status !== 0) {
    process.exit(status);
  }

  const { success, result, errors } = JSON.parse(stdout.toString());

  if (!success) {
    console.log(`::error ::${errors[0].message}`);
    process.exit(1);
  }

  const name = process.env.INPUT_NAME;
  const record = result.find((x) => x.name === name);

  if (!record) {
    return null;
  }

  return record.id;
};

const createRecord = () => {
  // https://api.cloudflare.com/#dns-records-for-a-zone-create-dns-record
  const { status, stdout } = cp.spawnSync("curl", [
    ...["--request", "POST"],
    ...["--header", `Authorization: Bearer ${process.env.INPUT_TOKEN}`],
    ...["--header", "Content-Type: application/json"],
    ...["--silent", "--data"],
    JSON.stringify({
      type: process.env.INPUT_TYPE,
      name: process.env.INPUT_NAME,
      content: process.env.INPUT_CONTENT,
      ttl: Number(process.env.INPUT_TTL),
      proxied: process.env.INPUT_PROXIED == "true",
    }),
    `https://api.cloudflare.com/client/v4/zones/${process.env.INPUT_ZONE}/dns_records`,
  ]);

  if (status !== 0) {
    process.exit(status);
  }
  const { success, result, errors } = JSON.parse(stdout.toString());

  if (!success) {
    console.dir(errors[0]);
    console.log(`::error ::${errors[0].message}`);
    process.exit(1);
  }

  saveOutput(result);
};

const updateRecord = (id) => {
  console.log(`Record exists with ${id}, updating...`);
  // https://api.cloudflare.com/#dns-records-for-a-zone-update-dns-record
  const { status, stdout } = cp.spawnSync("curl", [
    ...["--request", "PUT"],
    ...["--header", `Authorization: Bearer ${process.env.INPUT_TOKEN}`],
    ...["--header", "Content-Type: application/json"],
    ...["--silent", "--data"],
    JSON.stringify({
      type: process.env.INPUT_TYPE,
      name: process.env.INPUT_NAME,
      content: process.env.INPUT_CONTENT,
      ttl: Number(process.env.INPUT_TTL),
      proxied: process.env.INPUT_PROXIED == "true",
    }),
    `https://api.cloudflare.com/client/v4/zones/${process.env.INPUT_ZONE}/dns_records/${id}`,
  ]);

  if (status !== 0) {
    process.exit(status);
  }

  const { success, result, errors } = JSON.parse(stdout.toString());

  if (!success) {
    console.dir(errors[0]);
    console.log(`::error ::${errors[0].message}`);
    process.exit(1);
  }

  saveOutput(result);
};

const id = getCurrentRecordId();
if (id) {
  updateRecord(id);
  process.exit(0);
}
createRecord();
