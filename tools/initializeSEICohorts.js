require('dotenv').config();
const Bottleneck = require('bottleneck');
const { createTeam, addUsersToTeam } = require('../github');
const { createNewCohort, addStudentToCohort, updateCohortContent } = require('../learn');
const { loadGoogleSpreadsheet, getRows } = require('../googleSheets');
const { SHEET_ID_CESP_ROSTER } = require('../config');
const { DOC_ID_CESP } = require('../config/cohorts');

/**
 * Playbook for running this script:
 * - Normally run on W0D1/W0D2, the day after final deadlines and after roster sync.
 * - Set the CONFIG object to match all of the details about new cohorts,
 *   with staff list coming from the EDU Org Chart Google Sheet.
 *   https://docs.google.com/spreadsheets/d/1U_6ufNGVAmBxY69uBgTG-BhgBgCEkcgJzRWu3JFMUy8/edit#gid=1864231488
 * - Date configs come from the Product Calendar sheet.
 *   https://docs.google.com/spreadsheets/d/1F4JVODrkuycZlzkHVk71uwQ7_8V5cnEOZnuOqRtII8k/edit#gid=1397850501
 * - The DO_IT_LIVE flag toggles between a dry run, logging what _would_ happen.
 *   Recommended to run each step with DO_IT_LIVE false as a test run/sanity check.
 * - If adding students as a separate step, grab the Learn UIDs of newly-created cohorts
 *   and populate them in the cohortIds object, so that students get added to the right places.
 * - Conventionally, this is done in two runs:
 *   First, to set everything up staff-side with CREATE_COHORTS true and ADD_STAFF true,
 *   Second, once the rosters are finalized, with only ADD_STUDENTS true.
 * - When CREATE_COHORTS is true, a Slack message is printed to be sent in the PLs channel.
 *   Recommended to follow these links to make sure they were all created correctly!
 */

// Set to true to actually run the commands on remote APIs
const DO_IT_LIVE = true;
const CREATE_COHORTS = false; // Create groups in GitHub and Learn
const ADD_STAFF = false; // Add staff members to the GitHub teams and Learn cohorts
const ADD_STUDENTS = true; // Add students to the GitHub teams and Learn cohorts

const LEARN_COHORT_FT_START_DATE = '2023-03-27'; // direct from product cal
const LEARN_COHORT_FT_END_DATE = '2023-06-23'; // start date of round after NEXT
const LEARN_COHORT_PRECOURSE_START_DATE = '2023-03-27'; // direct from product cal
const LEARN_COHORT_PRECOURSE_END_DATE = '2023-05-15'; // start date of next round

const CONFIG = [{
  teamName: 'Students: RFP2303',
  learnCampusName: 'Remote Pacific',
  learnCohortName: 'SEI-RFP2303',
  learnCohortLabel: '23-03-SEI-RFP',
  learnCohortStartDate: LEARN_COHORT_FT_START_DATE,
  learnCohortEndDate: LEARN_COHORT_FT_END_DATE,
  learnContentConfig: 'https://github.com/gSchool/learn-course-files/blob/master/SE/SEI/hrr.yaml',
  precourseCampusName: 'RFT Pacific',
  staff: [{
    firstName: 'Gauri', lastName: 'Iyer', email: 'gauri.iyer@galvanize.com', github: 'iyergauri',
  }, {
    firstName: 'Kevin', lastName: 'Goble', email: 'kevin.goble@galvanize.com', github: 'Gobleizer',
  }, {
    firstName: 'Julian', lastName: 'Yuen', email: 'julian.yuen@galvanize.com', github: 'jyuen',
  },
  // SEIRs
  {
    firstName: 'Thomas', lastName: 'Spitz', github: 'tjspitz', email: 'thomas.spitz@galvanize.com',
  }, {
    firstName: 'Sandy', lastName: 'Chu', github: 'schu96', email: 'sandy.chu@galvanize.com',
  }, {
    firstName: 'Matthew', lastName: 'Sigler', github: 'siglerm', email: 'matthew.sigler@galvanize.com',
  }],
}, {
  teamName: 'Students: RFE2303',
  learnCampusName: 'Remote Eastern',
  learnCohortName: 'SEI-RFE2303',
  learnCohortLabel: '23-03-SEI-RFE',
  learnCohortStartDate: LEARN_COHORT_FT_START_DATE,
  learnCohortEndDate: LEARN_COHORT_FT_END_DATE,
  learnContentConfig: 'https://github.com/gSchool/learn-course-files/blob/master/SE/SEI/sei12.yaml',
  precourseCampusName: 'RFT Eastern',
  staff: [{
    firstName: 'Tosin', lastName: 'Awofeso', github: 'midastouchprd', email: 'tosin.awofeso@galvanize.com',
  }, {
    firstName: 'Esti', lastName: 'Gajda', github: 'themanofsteal', email: 'esti.gajda@galvanize.com',
  },
  // SEIRs
  {
    firstName: 'Aaron', lastName: 'Mikulka', github: 'amikulka', email: 'Aaron.Mikulka@galvanize.com',
  }, {
    firstName: 'Joon', lastName: 'Hwang', github: 'codejune9th', email: 'Joon.Hwang@galvanize.com',
  }, {
    firstName: 'Luke', lastName: 'Anger', github: 'LukeAnger', email: 'Luke.Anger@galvanize.com',
  }, {
    firstName: 'Nika', lastName: 'Woodfill', github: 'nikawoodfill', email: 'Nika.Woodfill@galvanize.com',
  }, {
    firstName: 'Patrick', lastName: 'Kelly', github: 'Patrick-Kelly-1330', email: 'Patrick.Kelly@galvanize.com',
  }, {
    firstName: 'Claire', lastName: 'Tunakan', github: 'ctunakan', email: 'Claire.Tunaka@galvanize.com',
  }, {
    firstName: 'Willy', lastName: 'McNamara', github: 'Willy-McNamara', email: 'William.McNamara@galvanize.com',
  }],
}, {
  teamName: 'Students: SEIP2305',
  learnCampusName: 'Precourse',
  learnCohortName: 'SEI - Precourse - May 2023',
  learnCohortLabel: null,
  learnCohortStartDate: LEARN_COHORT_PRECOURSE_START_DATE,
  learnCohortEndDate: LEARN_COHORT_PRECOURSE_END_DATE,
  learnCohortIsPrep: true,
  learnContentConfig: 'https://github.com/gSchool/learn-course-files/blob/master/SE/SEI/SEIP.yaml',
  staff: [{
    firstName: 'Beverly', lastName: 'Hernandez', email: 'beverly.hernandez@galvanize.com', github: 'beverlyAH',
  }, {
    firstName: 'David', lastName: 'Coleman', email: 'david.coleman@galvanize.com', github: 'colemandavid55',
  }, {
    firstName: 'Eliza', lastName: 'Drinker', email: 'eliza.drinker@galvanize.com', github: 'aesuan',
  }, {
    firstName: 'Steven', lastName: 'Chung', email: 'steven.chung@galvanize.com', github: 'stevenchung213',
  }],
}];

// map of learnCohortName to UID
// populated when cohorts are created
// if doing a late-run, or student population, set these manually!
// the UIDs of newly-created cohorts are logged at creation-time
const cohortIds = {
  'SEI-RFE2303': '4d38eb5b7addde3a05',
  'SEI-RFP2303': 'd265f531db3ba05bad',
  'SEI - Precourse - May 2023': '3992ac7f363b624af8',
};

// END OF CONFIGURATION

const learnRateLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 500,
});
const addStudentToCohortRL = learnRateLimiter.wrap(addStudentToCohort);

const formatGitHubTeamNameAsSlug = (teamName) => teamName.replace(/:/g, '').replace(/\s+/g, '-');

const createGitHubTeams = () => Promise.all(
  CONFIG.map((config) => {
    console.log('Create GitHub team', config.teamName);
    if (!DO_IT_LIVE) return 'This is a test';
    return createTeam(config.teamName);
  }),
);

const addInstructorsToGitHubTeams = () => Promise.all(
  CONFIG.map((config) => {
    const usernames = config.staff.filter((s) => s.github).map((s) => s.github);
    console.log(`Adding staff to GitHub Team ${formatGitHubTeamNameAsSlug(config.teamName)}: ${usernames}...`);
    if (!DO_IT_LIVE) return 'This is a test';
    return addUsersToTeam(usernames, formatGitHubTeamNameAsSlug(config.teamName), true);
  }),
);

const createLearnCohorts = () => Promise.all(
  CONFIG.map(async (config) => {
    const cohort = {
      name: config.learnCohortName,
      product_type: 'SEI',
      label: config.learnCohortLabel,
      campus_name: config.learnCampusName,
      starts_on: config.learnCohortStartDate,
      ends_on: config.learnCohortEndDate,
      program: 'Consumer',
      subject: 'Software Engineering',
      cohort_format: 'Full Time',
      category: config.learnCohortIsPrep ? 'Prep' : 'Immersive',
    };
    console.log('Create Learn cohort', cohort);
    if (DO_IT_LIVE) {
      const cohortId = await createNewCohort(cohort);
      cohortIds[config.learnCohortName] = cohortId;
      console.log(`Created Learn cohort ${config.learnCohortName} with UID ${cohortId}`);
      const resyncResponse = await updateCohortContent(cohortId, config.learnContentConfig);
      console.log(`Resynced new cohort with config URL ${config.learnContentConfig} (Response: ${resyncResponse ? 'OK' : 'Error!'})`);
    }
  }),
);

const addInstructorsToLearnCohorts = () => Promise.all(
  CONFIG.map(async (config) => {
    const learnCohortId = cohortIds[config.learnCohortName];
    if (!learnCohortId) {
      console.info(`No cohort ID found for cohort "${config.learnCohortName}", skipping...`);
      return;
    }
    for (const { firstName, lastName, email } of config.staff) {
      const staff = {
        first_name: firstName,
        last_name: lastName,
        email,
        instructor: true,
      };
      console.log('Create staff', config.learnCohortName, learnCohortId, staff);
      if (DO_IT_LIVE) {
        await addStudentToCohortRL(learnCohortId, staff);
      }
    }
  }),
);

const getStudentsToOnboard = async () => {
  const cespSheet = await loadGoogleSpreadsheet(DOC_ID_CESP);
  const students = await getRows(cespSheet.sheetsById[SHEET_ID_CESP_ROSTER]);
  const eligibleStudents = students.filter((student) => student['Precourse Complete'] === 'Yes' && student.Status === 'Enrolled');
  console.log('eligible students', eligibleStudents.length, 'of', students.length);
  return eligibleStudents.map((student) => ({
    fullName: student['Full Name'],
    campus: student.Campus,
    githubHandle: student.GitHub,
    email: student['SFDC Email'],
  }));
};

const addStudentsToGitHubTeams = async (students) => {
  const cohortConfigs = CONFIG.filter((config) => !config.learnCohortIsPrep);
  for (const config of cohortConfigs) {
    const campusStudents = students.filter((student) => config.precourseCampusName === student.campus);
    if (!campusStudents.length) {
      console.log(`Cannot find matching CES&P campus for config campus named "${config.precourseCampusName}", skipping!`);
      return null;
    }
    const campusName = formatGitHubTeamNameAsSlug(config.teamName);
    console.log('Add', campusStudents.length, 'students to team', campusName);
    console.log(campusStudents.map((student) => student.githubHandle));
    if (!DO_IT_LIVE) continue;
    await addUsersToTeam(campusStudents.map((student) => student.githubHandle), campusName);
  }
  return true;
};

const addStudentsToLearnCohorts = async (students) => {
  const studentsWithValidCampus = students.filter((student) => CONFIG.find((config) => config.precourseCampusName === student.campus));
  for (const student of studentsWithValidCampus) {
    const campusConfig = CONFIG.find((config) => config.precourseCampusName === student.campus);
    if (!campusConfig) {
      console.log(`Cannot find matching config campus for student "${student.fullName}" with CES&P campus "${student.campus}", skipping!`);
      return null;
    }
    const learnCohortId = cohortIds[campusConfig.learnCohortName];
    const splitName = student.fullName.split(' ');
    const learnStudent = {
      first_name: splitName[0],
      last_name: splitName[splitName.length - 1],
      email: student.email,
    };
    console.log('Add student from Precourse', student.campus, 'to', campusConfig.learnCampusName, learnCohortId, JSON.stringify(learnStudent));
    if (!DO_IT_LIVE) continue;
    await addStudentToCohortRL(learnCohortId, learnStudent);
  }
  return true;
};

// eslint-disable-next-line no-unused-vars
const initializeNewCohorts = async () => {
  console.log('Creating GitHub teams...');
  const gitHubTeamResult = await createGitHubTeams();
  console.log(gitHubTeamResult);

  console.log('Creating Learn cohorts...');
  const learnCohortResult = await createLearnCohorts();
  console.log(learnCohortResult);
};

// eslint-disable-next-line no-unused-vars
const populateNewCohortsWithStaff = async () => {
  console.log('Adding instructors to GitHub teams...');
  const addInstructorsToGitHubResult = await addInstructorsToGitHubTeams();
  console.log(addInstructorsToGitHubResult);

  console.log('Adding instructors to Learn cohorts...');
  const addInstructorsToLearnResult = await addInstructorsToLearnCohorts();
  console.log(addInstructorsToLearnResult);
};

// eslint-disable-next-line no-unused-vars
const populateNewCohortsWithStudents = async () => {
  console.log('Getting students from roster...');
  const students = await getStudentsToOnboard();
  console.log(`Got ${students.length} students!`);

  console.log('Adding students to GitHub teams...');
  const addStudentsToGitHubResult = await addStudentsToGitHubTeams(students);
  console.log(addStudentsToGitHubResult);

  console.log('Adding students to Learn cohorts...');
  const addStudentsToLearnResult = await addStudentsToLearnCohorts(students);
  console.log(addStudentsToLearnResult);
};

const printURLs = () => {
  console.log('\n*New cohorts have been created!* 🎉\n');
  console.log(
    CONFIG.map((config) => [
      `*${config.learnCampusName} (${config.learnCohortName})*`,
      `_GitHub_: https://github.com/orgs/hackreactor/teams/${formatGitHubTeamNameAsSlug(config.teamName)}/members`,
      `_Learn_: https://learn-2.galvanize.com/cohorts/${cohortIds[config.learnCohortName]}/users`,
      '',
    ].join('\n')).join('\n'),
  );
};

(async () => {
  if (CREATE_COHORTS) {
    await initializeNewCohorts();
    printURLs();
  }
  if (ADD_STAFF) { await populateNewCohortsWithStaff(); }
  if (ADD_STUDENTS) { await populateNewCohortsWithStudents(); }
})();
