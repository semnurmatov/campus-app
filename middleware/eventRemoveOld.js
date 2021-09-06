const db = require('../util/database');

module.exports = async (req, res, next) => {
    let events = await db.execute('SELECT * FROM events');
    events = events[0];
    if (!events) {
        const error = new Error('Event not found');
        error.code = 401;
        throw error;
    }

    let len = events.length;
    let todayDate = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < len; i++) {
        let eventDate = events[i].date.toISOString();
        if (todayDate > eventDate) {
            await db.execute('DELETE FROM events WHERE eventID="' + events[i].eventID + '"');
        }
    }
    next();
}