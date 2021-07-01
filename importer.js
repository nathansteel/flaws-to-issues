//
// do the work of actually importing the flaws
// 

const fs = require('fs');
const processPipelineFlaws = require('./pipeline').processPipelineFlaws;
const processPolicyFlaws = require('./policy').processPolicyFlaws;
const processSCAFlaws = require('./sca').processSCAFlaws;
const label = require('./label');


//
// main driver to handle importing the flaws
//
async function importFlaws(options) {
    const resultsFile = options.resultsFile;
    const githubOwner = options.githubOwner;
    const githubRepo = options.githubRepo;
    const githubToken = options.githubToken;
    const waitTime = parseInt(options.waitTime);
    var flawData;

    // basic sanity checking
    if(resultsFile === undefined || resultsFile === null)
        throw new Error('missing results file')
    if(githubOwner === undefined || githubOwner === null)
        throw new Error('missing github owner')
    if(githubRepo === undefined || githubRepo === null)
        throw new Error('missing github repo')
    if(githubToken === undefined || githubToken === null)
        throw new Error('missing github token')

    // validate file exists, and read from it
    try {
        if(fs.existsSync(resultsFile)) {
            console.log(`Processing file: ${resultsFile}`);
            flawData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        } else {
            throw `Unable to locate scan results file: ${resultsFile}`;
        }
    } catch(err) {
        throw new Error(err);
    }

    // figure out which file type we're dealing with, pipeline or policy
    let scanType = '';
    if('pipeline_scan' in flawData)
        scanType = 'pipeline';
    else if('_embedded' in flawData && 'issue_id' in flawData)
        scanType = 'policy';
    else if('_embedded' in flawData)
        scanType = 'SCA';
    else 
        throw new Error ('Unknown file type for input file');

    console.log(`Importing ${scanType} flaws into  ${githubOwner}/${githubRepo}.  ${waitTime} seconds between imports (to handle GitHub rate limiting)`);

    // create the labels 
    await label.createLabels(options)

    label.buildSeverityXref();          // TODO: cleanup, merge into label init?

    // process the flaws
    if(scanType == 'pipeline') {
        await processPipelineFlaws(options, flawData)
        .then (count => {
            console.log(`Done.  ${count} flaws processed.`);
        })
    } else if (scanType == 'policy') {
        await processPolicyFlaws(options, flawData)
        .then (count => {
            console.log(`Done.  ${count} flaws processed.`);
        })
    } else {
        await processSCAFlaws(options, flawData)
        .then (count => {
            console.log(`Done. ${count} flaws processed.`);
        })
    }
}

module.exports = { importFlaws };