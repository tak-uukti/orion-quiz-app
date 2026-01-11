// MongoDB Test Utilities
const { MongoClient } = require('mongodb');

const MONGODB_URL = 'mongodb://localhost:27017';
const DATABASE_NAME = 'quiz_app';

let client = null;
let db = null;

/**
 * Connect to MongoDB database
 */
async function connectMongoDB() {
    if (client) return { client, db };

    client = new MongoClient(MONGODB_URL);
    await client.connect();
    db = client.db(DATABASE_NAME);
    console.log('Connected to MongoDB:', DATABASE_NAME);

    return { client, db };
}

/**
 * Close MongoDB connection
 */
async function closeMongoDB() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('Disconnected from MongoDB');
    }
}

/**
 * Clear all test data from database
 */
async function clearDatabase() {
    if (!db) await connectMongoDB();

    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
        await db.collection(collection.name).deleteMany({});
    }
    console.log('Database cleared');
}

/**
 * Get session data by room ID
 * @param {string} roomId - The room ID to query
 * @returns {Promise<object|null>} Session document
 */
async function getSession(roomId) {
    if (!db) await connectMongoDB();

    const session = await db.collection('sessions').findOne({ room_id: roomId });
    return session;
}

/**
 * Verify session exists and has correct initial state
 * @param {string} roomId - The room ID
 * @returns {Promise<boolean>} True if session is valid
 */
async function verifySessionCreated(roomId) {
    const session = await getSession(roomId);

    if (!session) {
        console.error(`Session not found for room: ${roomId}`);
        return false;
    }

    if (session.status !== 'CREATED') {
        console.error(`Expected status CREATED, got: ${session.status}`);
        return false;
    }

    if (!Array.isArray(session.players) || session.players.length !== 0) {
        console.error(`Expected empty players array, got:`, session.players);
        return false;
    }

    if (!Array.isArray(session.responses) || session.responses.length !== 0) {
        console.error(`Expected empty responses array, got:`, session.responses);
        return false;
    }

    console.log(`✓ Session ${roomId} created correctly`);
    return true;
}

/**
 * Verify players have been added to session
 * @param {string} roomId - The room ID
 * @param {number} expectedCount - Expected number of players
 * @returns {Promise<boolean>} True if players match expected count
 */
async function verifyPlayersAdded(roomId, expectedCount) {
    const session = await getSession(roomId);

    if (!session) {
        console.error(`Session not found for room: ${roomId}`);
        return false;
    }

    if (session.players.length !== expectedCount) {
        console.error(`Expected ${expectedCount} players, got ${session.players.length}`);
        return false;
    }

    console.log(`✓ ${expectedCount} players added to session ${roomId}`);
    return true;
}

/**
 * Verify game status has been updated
 * @param {string} roomId - The room ID
 * @param {string} expectedStatus - Expected status (CREATED, STARTED, FINISHED)
 * @returns {Promise<boolean>} True if status matches
 */
async function verifyGameStatus(roomId, expectedStatus) {
    const session = await getSession(roomId);

    if (!session) {
        console.error(`Session not found for room: ${roomId}`);
        return false;
    }

    if (session.status !== expectedStatus) {
        console.error(`Expected status ${expectedStatus}, got: ${session.status}`);
        return false;
    }

    console.log(`✓ Game status is ${expectedStatus} for room ${roomId}`);
    return true;
}

/**
 * Verify responses have been recorded
 * @param {string} roomId - The room ID
 * @param {number} expectedCount - Expected number of responses
 * @returns {Promise<boolean>} True if response count matches
 */
async function verifyResponses(roomId, expectedCount) {
    const session = await getSession(roomId);

    if (!session) {
        console.error(`Session not found for room: ${roomId}`);
        return false;
    }

    if (session.responses.length !== expectedCount) {
        console.error(`Expected ${expectedCount} responses, got ${session.responses.length}`);
        console.error('Responses:', JSON.stringify(session.responses, null, 2));
        return false;
    }

    console.log(`✓ ${expectedCount} responses recorded for room ${roomId}`);
    return true;
}

/**
 * Verify response data accuracy
 * @param {string} roomId - The room ID
 * @param {number} questionIndex - Question index to verify
 * @returns {Promise<object>} Verification result with details
 */
async function verifyResponseAccuracy(roomId, questionIndex) {
    const session = await getSession(roomId);

    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    const questionResponses = session.responses.filter(r => r.question_index === questionIndex);
    const results = {
        success: true,
        questionIndex,
        responseCount: questionResponses.length,
        details: []
    };

    for (const response of questionResponses) {
        const detail = {
            sid: response.sid,
            answerIndex: response.answer_index,
            isCorrect: response.is_correct,
            scoreAwarded: response.score_awarded,
            valid: true,
            issues: []
        };

        // Validate score logic
        if (response.is_correct && response.score_awarded !== 1000) {
            detail.valid = false;
            detail.issues.push(`Correct answer should award 1000 points, got ${response.score_awarded}`);
        }

        if (!response.is_correct && response.score_awarded !== 0) {
            detail.valid = false;
            detail.issues.push(`Wrong answer should award 0 points, got ${response.score_awarded}`);
        }

        // Validate timestamp
        if (!response.timestamp) {
            detail.valid = false;
            detail.issues.push('Missing timestamp');
        }

        if (!detail.valid) {
            results.success = false;
        }

        results.details.push(detail);
    }

    console.log(`✓ Response accuracy verified for question ${questionIndex} in room ${roomId}`);
    return results;
}

/**
 * Verify question start times are recorded
 * @param {string} roomId - The room ID
 * @param {number} questionCount - Expected number of questions
 * @returns {Promise<boolean>} True if all question start times are recorded
 */
async function verifyQuestionStartTimes(roomId, questionCount) {
    const session = await getSession(roomId);

    if (!session) {
        console.error(`Session not found for room: ${roomId}`);
        return false;
    }

    const startTimes = session.question_start_times || {};
    const recordedCount = Object.keys(startTimes).length;

    if (recordedCount !== questionCount) {
        console.error(`Expected ${questionCount} question start times, got ${recordedCount}`);
        return false;
    }

    console.log(`✓ All ${questionCount} question start times recorded for room ${roomId}`);
    return true;
}

/**
 * Get all sessions from database
 * @returns {Promise<array>} Array of all session documents
 */
async function getAllSessions() {
    if (!db) await connectMongoDB();

    const sessions = await db.collection('sessions').find({}).toArray();
    return sessions;
}

/**
 * Print session details for debugging
 * @param {string} roomId - The room ID
 */
async function printSessionDetails(roomId) {
    const session = await getSession(roomId);

    if (!session) {
        console.log(`❌ Session not found for room: ${roomId}`);
        return;
    }

    console.log('\n========== SESSION DETAILS ==========');
    console.log(`Room ID: ${session.room_id}`);
    console.log(`Status: ${session.status}`);
    console.log(`Created At: ${session.created_at}`);
    console.log(`Players (${session.players.length}):`);
    session.players.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (${p.sid})`);
    });
    console.log(`Responses (${session.responses.length}):`);
    session.responses.forEach((r, i) => {
        console.log(`  ${i + 1}. Q${r.question_index} - Ans:${r.answer_index} - Correct:${r.is_correct} - Score:${r.score_awarded}`);
    });
    console.log(`Question Start Times:`, session.question_start_times || 'None');
    console.log('=====================================\n');
}

module.exports = {
    connectMongoDB,
    closeMongoDB,
    clearDatabase,
    getSession,
    verifySessionCreated,
    verifyPlayersAdded,
    verifyGameStatus,
    verifyResponses,
    verifyResponseAccuracy,
    verifyQuestionStartTimes,
    getAllSessions,
    printSessionDetails
};
