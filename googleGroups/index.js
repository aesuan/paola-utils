// ------------------------------
// Google Groups API Integrations
// ------------------------------
const { google } = require('googleapis');
const key = require('../../google/admin_sdk_client_secret.json');

const scopes = ['https://www.googleapis.com/auth/admin.directory.group'];
const jwt = new google.auth.JWT(key.client_email, null, key.private_key, scopes, 'paola@galvanize.com');

const auth = async () => {
  await jwt.authorize((err, token) => {
    if (err) return err;
    return token;
  });

  return google.admin(
    { version: 'directory_v1', auth: jwt },
  );
};

// Read all members in a group
exports.getAllGroupMembers = async (groupId) => {
  try {
    const service = await auth();
    const res = await service.members.list({
      groupKey: groupId,
    });
    if (!res.data.members) return [];
    return res.data.members;
  } catch (error) {
    return error.message;
  }
};

// Add a student to a group
exports.addGroupMember = async (groupId, userEmail) => {
  try {
    const service = await auth();
    const res = await service.members.insert({
      groupKey: groupId,
      resource: { email: userEmail },
    });
    return res.data && res.data.status === 'ACTIVE';
  } catch (error) {
    return error.message;
  }
};

// Delete a student from a group
exports.removeGroupMember = async (groupId, userEmail) => {
  try {
    const service = await auth();
    const res = await service.members.delete({
      groupKey: groupId,
      memberKey: userEmail,
    });
    return res.status === 204;
  } catch (error) {
    return error.message;
  }
};

// Delete all students from a group
exports.removeAllGroupMembers = async (groupId) => {
  try {
    const service = await auth();
    const members = await exports.getAllGroupMembers(groupId);
    if (typeof members === 'string') throw new Error(members);
    await members.forEach((user) => {
      service.members.delete({
        groupKey: groupId,
        memberKey: user.email,
      });
    });
    return true;
  } catch (error) {
    return error.message;
  }
};
