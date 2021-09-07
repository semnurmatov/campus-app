const db = require('../util/database');
const validator = require('validator');
const cloudinary = require('../config/cloudinary');

const userDefaultImage = "'cikhthfn2p3ireaot99v";
const scDefaultImage = "c68zvrhgwzlvgow95x4t";

const processUploadCloudinary = async (file) => {
    const { createReadStream, filename } = await file;

    try {
        const result = await new Promise((resolve, reject) => {
            createReadStream().pipe(
                cloudinary.v2.uploader.upload_stream({
                   
                    allowed_formats: ["png", "jpg", "jpeg"],
                    public_id: ""
                }, (error, result) => {
                    if (error) {
                        reject(error)
                    }

                    resolve(result)
                })
            )
        })
        return result.secure_url;
    } catch (err) {
        console.log("errors: " + JSON.stringify(err));
    }


}

const processDeleteCloudinary = async (url) => {
    if (url.includes(userDefaultImage) || url.includes(scDefaultImage)) {
        return true;
    }
    const publicID = (url.substring(67).split('.'))[0];
    try {
        const result = await cloudinary.v2.uploader.destroy(publicID, (err, res) => {
            if (err) throw err

        })
        if (result) return true;
        return false;
    } catch (err) {
        console.log(err);
    }
}

const resolvers = {
    RootQuery: {
        login: async function (_, { email, password }) {
            let user;
            let typeOfUser;
            if (email.includes("std")) {
                user = await db.execute('SELECT * FROM students WHERE email="' + email + '"');
                user = user[0][0];
                if (!user) {
                    const error = new Error('User not found');
                    error.code = 401;
                    throw error;
                }
                typeOfUser = "Student"
            }
            else {
                user = await db.execute('SELECT * FROM staff WHERE email="' + email + '"');
                user = user[0][0];
                if (!user) {
                    const error = new Error('User not found');
                    error.code = 401;
                    throw error;
                }
                if (user.department === "Cook") {
                    typeOfUser = "Cook";
                }
                else {
                    typeOfUser = "Lecturer"
                }
            }

            if (!(password === user.password)) {
                const error = new Error('Password is incorrect');
                error.code = 401;
                throw error;
            }
            let socialClub = "false";

            if (!user.imageUrl) {
                user.imageUrl = "No Image";
            }

            if (typeOfUser === "Student") {
                if (user.sco === 1) {
                    let socialClubTitle = await db.query('SELECT title FROM socialClubs WHERE scoID=?', [user.stdID]);
                    socialClubTitle = socialClubTitle[0][0];
                    socialClub = socialClubTitle.title;
                }

                return {
                    typeOfUser: typeOfUser,
                    userID: user.stdID,
                    socialClub: socialClub,
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                    phone: user.phone,
                    imageUrl: user.imageUrl
                }
            }
            else {
                return {
                    typeOfUser: typeOfUser,
                    userID: user.staffID,
                    socialClub: socialClub,
                    name: user.name,
                    surname: user.surname,
                    email: email,
                    phone: user.phone,
                    imageUrl: user.imageUrl
                }
            }
        },

        profile: async function (_, { userID, typeOfUser }) {
            let user;
            if (typeOfUser === "Student") {
                user = await db.execute('SELECT * FROM students WHERE stdID="' + userID + '"');
            }
            else {
                user = await db.execute('SELECT * FROM staff WHERE staffID="' + userID + '"');
            }
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }
            if (typeOfUser === "Cook" && typeOfUser != user.department) {
                const error = new Error("User not found");
                error.code = 401;
                throw error;
            }

            if (typeOfUser === "Student") {
                return {
                    name: user.name,
                    surname: user.surname,
                    title: user.title,
                    department: user.department,
                    email: user.email,
                    userID: user.stdID,
                    address: user.address,
                    phone: parseInt(user.phone),
                    balance: parseFloat(user.balance),
                    imageUrl: user.imageUrl
                }
            }
            else {
                return {
                    name: user.name,
                    surname: user.surname,
                    title: user.title,
                    department: user.department,
                    email: user.email,
                    userID: user.staffID,
                    address: user.address,
                    phone: parseInt(user.phone),
                    imageUrl: user.imageUrl
                }
            }
        },

        timetable: async function (_, { userID, typeOfUser }) {
            let user;
            if (typeOfUser === "Cook") {
                const error = new Error(" Invalid user");
                error.code = 401;
                throw error;
            }
            if (typeOfUser === "Student") {
                user = await db.execute('SELECT * FROM timetable JOIN courses ON timetable.courseCode=courses.courseCode JOIN studentsCourses ' +
                    'ON courses.courseCode=studentsCourses.codeOfCourse JOIN staff ON courses.lecturerID = staff.staffID JOIN days ON timetable.dayID=days.ID WHERE stdID="' + userID + '"');
            }
            else {
                user = await db.execute('SELECT * FROM timetable JOIN courses ON timetable.courseCode=courses.courseCode JOIN staff ON '+
                'courses.lecturerID=staff.staffID JOIN days ON timetable.dayID=days.ID WHERE lecturerID="' + userID + '"');
            }
            user = user[0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }
            
            return user.map(user => {
                return {
                    day: user.day,
                    courseCode: user.courseCode,
                    courseName: user.courseName,
                    time: user.time,
                    location: user.location,
                    lecturer: user.name + " " + user.surname
                }
            });
        },
        // list of all events
        events: async function (_, { userID, typeOfUser }) {
            let userType;
            let idType;
            if (typeOfUser === 'Student') {
                userType = "students";
                idType = "stdID";
            } else {
                userType = "staff";
                idType = "staffID";

            }

            let user = await db.query('SELECT * FROM ?? WHERE ??=?', [userType, idType, userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let events = await db.execute('SELECT * FROM events JOIN attendeeTypes ON events.attendeeType=attendeeTypes.typeID');
            events = events[0];
            if (!events) {
                const error = new Error('Event not found');
                error.code = 404;
                throw error;
            }

            const filteredEvents = [];
            for (let event of events) {
                const eventAttType = event.attendeeType;
                switch (eventAttType) {
                    case 2:
                        if (userType === "students") filteredEvents.push(event);
                        break;
                    case 3:
                        if (userType === "staff") filteredEvents.push(event);
                        break;
                    case 4:
                        const scName = event.organizer.replace(/\s+/g, '').toUpperCase();
                        let scMember = await db.query('SELECT * FROM ?? WHERE userID=?', [scName, userID]);
                        if (scMember[0][0]) {
                            filteredEvents.push(event);
                        }
                        break;
                    default:
                        filteredEvents.push(event);
                        break;
                }
            }

            return filteredEvents.map(events => {
                return {
                    title: events.title,
                    time: events.time.substring(0, events.time.length - 3),
                    date: events.date.toISOString().slice(0, 10),
                    location: events.location,
                    price: events.price,
                    organizer: events.organizer,
                    createdAt: events.createdAt.toISOString(),
                    eventID: events.eventID,
                    description: events.description,
                    attendee: events.attendee,
                    imageUrl: events.imageUrl,
                    creator: events.creator
                };
            });
        },
        // list of events that I have joined 
        myEvents: async function (_, { userID }) {
            let myEvents = await db.query('SELECT * FROM eventAttendee JOIN events ON eventAttendee.eventID = events.eventID JOIN attendeeTypes ON events.attendeeType=attendeeTypes.typeID WHERE userID=?', [userID]);
            myEvents = myEvents[0];
            if (!myEvents) {
                const error = new Error("Events not found");
                error.code = 401;
                throw error;
            }

            return myEvents.map(events => {
                return {
                    title: events.title,
                    time: events.time.substring(0, events.time.length - 3),
                    date: events.date.toISOString().slice(0, 10),
                    location: events.location,
                    price: events.price,
                    organizer: events.organizer,
                    createdAt: events.createdAt.toISOString(),
                    eventID: events.eventID,
                    description: events.description,
                    attendee: events.attendee,
                    imageUrl: events.imageUrl,
                    creator: events.creator
                };
            });

        },
        // list of events of Social clubs that I follow
        socialClubEvents: async function (_, { userID }) {
            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User is not found');
                error.code = 401;
                throw error;
            }

            let joinedSC = await db.query('SELECT * FROM socialClubsMembers WHERE userID=?', [userID]);
            joinedSC = joinedSC[0];
            if (!joinedSC) {
                const error = new Error('Joined social clubs are not found');
                error.code - 404;
                throw error;
            }

            let joinedSCEvent;
            let events = [];
            for (let i = 0; i < joinedSC.length; i++) {
                joinedSCEvent = await db.query('SELECT events.* FROM socialClubs JOIN events ON socialClubs.scoID = events.creator JOIN attendeeTypes ON events.attendeeType=attendeeTypes.typeID WHERE scID=?', [joinedSC[i].scID]);
                joinedSCEvent = joinedSCEvent[0][0];
                if (joinedSCEvent) {
                    events.push(joinedSCEvent);
                }
            };

            return events.map(events => {
                return {
                    title: events.title,
                    time: events.time.substring(0, events.time.length - 3),
                    date: events.date.toISOString().slice(0, 10),
                    location: events.location,
                    price: events.price,
                    organizer: events.organizer,
                    createdAt: events.createdAt.toISOString(),
                    eventID: events.eventID,
                    description: events.description,
                    attendee: events.attendee,
                    imageUrl: events.imageUrl,
                    creator: events.creator
                };
            });
        },
        //  list of Owner's events
        hostEvents: async function (_, { userID }) {
            let isOwner = await db.query('SELECT * FROM students WHERE stdID=? AND sco=1', [userID]);
            isOwner = isOwner[0];
            if (!isOwner.length > 0) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }
            let hostEvents = await db.execute('SELECT * FROM events JOIN attendeeTypes ON events.attendeeType=attendeeTypes.typeID WHERE creator="' + userID + '"');
            hostEvents = hostEvents[0];
            if (!hostEvents) {
                const error = new Error('User events not found');
                error.code = 401;
                throw error;
            }

            return hostEvents.map(events => {
                return {
                    title: events.title,
                    time: events.time.substring(0, events.time.length - 3),
                    date: events.date.toISOString().slice(0, 10),
                    location: events.location,
                    price: events.price,
                    organizer: events.organizer,
                    createdAt: events.createdAt.toISOString(),
                    eventID: events.eventID,
                    description: events.description,
                    attendee: events.attendee,
                    imageUrl: events.imageUrl,
                    creator: events.creator
                };
            });

        },

        listOfAttendees: async function (_, { eventID }) {

            let event = await db.query('SELECT * FROM events WHERE eventID=?', [eventID]);
            event = event[0][0];
            if (!event) {
                const error = new Error('Event not found');
                error.code = 404;
                throw error;
            }

            let list = await db.query('SELECT * FROM eventAttendee WHERE eventID=?', [eventID]);
            list = list[0];
            if (!list) {
                const error = new Error('Event list not found');
                error.code = 404;
                throw error;
            }

            let count = 1;

            const array = [];
            let userData;
            for (let data of list) {
                let user = await db.query('SELECT * FROM students WHERE stdID=?', [data.userID]);
                if (!user[0][0]) {
                    user = await db.query('SELECT * FROM staff WHERE staffID=?', [data.userID]);
                    if (!user[0][0]) {
                        const error = new Error('User not found');
                        throw error;
                    }
                }
                user = user[0][0];
                userData = {
                    count: count++,
                    eventID: data.eventID,
                    userID: data.userID,
                    name: user.name,
                    surname: user.surname,
                    phone: user.phone,
                    imageUrl: user.imageUrl,
                    joinedAt: data.joinedAt.toISOString()
                }

                array.push(userData);
            }

            return array;
        },
        // list of all Social Clubs
        socialClubs: async function (_) {
            let socialClubs = await db.execute('SELECT * FROM socialClubs');
            socialClubs = socialClubs[0];
            if (!socialClubs) {
                const error = new Error('Social clubs not found');
                error.code = 401;
                throw error;
            }

            return socialClubs.map(data => {
                return {
                    scID: data.scID,
                    scoID: data.scoID,
                    title: data.title,
                    description: data.description,
                    imageUrl: data.imageUrl,
                    members: data.members
                }
            })
        },
        // detail page of a particular Social Club
        socialClub: async function (_, { scID, userID }) {
            const statuses = {
                member: 'member',
                wait: 'wait',
                non: 'non'
            }
            let status;
            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found..');
                error.code = 401;
                throw error;
            }

            let isMember = await db.query('SELECT * FROM socialClubsMembers WHERE scID=? AND userID=?', [scID, userID]);
            isMember = isMember[0][0];
            if (isMember) {
                status = statuses.member;
            } else {
                let isRequested = await db.query('SELECT * FROM socialClubsRequests WHERE scID=? AND userID=?', [scID, userID]);
                isRequested = isRequested[0][0];
                if (isRequested) {
                    status = statuses.wait;
                } else {
                    status = statuses.non;
                }
            }

            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social Club not found');
                error.code = 404;
                throw error;
            }

            return {
                scID: socialClub.scID,
                scoID: socialClub.scoID,
                title: socialClub.title,
                description: socialClub.description,
                imageUrl: socialClub.imageUrl,
                members: socialClub.members,
                status: status
            }
        },
        // list of social clubs that I follow
        mySocialClubs: async function (_, { userID }) {
            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let userSocialClubs = await db.query('SELECT * FROM socialClubsMembers JOIN socialClubs ON socialClubsMembers.scID = socialClubs.scID WHERE userID=?', [userID]);
            userSocialClubs = userSocialClubs[0];
            const listOfSC = [];

            let scData;
            for (let item of userSocialClubs) {
                if (userID === item.scoID) {
                    continue;
                }
                scData = {
                    scID: item.scID,
                    scoID: item.scoID,
                    title: item.title,
                    description: item.description,
                    imageUrl: item.imageUrl,
                    members: item.members
                }

                listOfSC.push(scData);

            }
            return listOfSC;
        },
        // return Social club of the owner
        hostSocialClub: async function (_, { userID }) {
            let hostSocialClub = await db.query('SELECT * FROM socialClubs WHERE scoID=?', [userID]);
            hostSocialClub = hostSocialClub[0][0];
            if (!hostSocialClub) {
                const error = new Error('Social Club not found');
                error.code = 404;
                throw error;
            }
            if (hostSocialClub.imageUrl === null) {
                hostSocialClub.imageUrl = "no image";
            }
            return {
                scID: hostSocialClub.scID,
                scoID: hostSocialClub.scoID,
                title: hostSocialClub.title,
                description: hostSocialClub.description,
                imageUrl: hostSocialClub.imageUrl,
                members: hostSocialClub.members
            }
        },
        // list of members of the social club
        socialClubMembers: async function (_, { scID }) {
            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social Club not found');
                error.code = 404;
                throw error;
            }
            let scName = socialClub.title.replace(/\s+/g, '').toUpperCase();

            let scMembers = await db.query('SELECT * FROM ??', [scName]);
            scMembers = scMembers[0];
            if (scMembers.length <= 0) {
                const error = new Error('Social club not found');
                error.code = 404;
                throw error;
            }
            const membersList = [];
            let userData;
            for (let member of scMembers) {
                let user = await db.query('SELECT * FROM students WHERE stdID=?', [member.userID]);
                user = user[0][0];
                if (!user) {
                    const error = new Error('User not found');
                    throw error;
                }
                userData = {
                    userID: member.userID,
                    name: user.name,
                    surname: user.surname,
                    imageUrl: user.imageUrl
                }
                membersList.push(userData);
            }

            return membersList;
        },
        // list of students who requested to join a social club ( userID of social club owner)
        socialClubRequests: async function (_, { userID }) {
            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scoID=?', [userID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let listOfCandidates = await db.query('SELECT * FROM socialClubsRequests JOIN students ON socialClubsRequests.userID=students.stdID WHERE scID=?', [socialClub.scID]);
            listOfCandidates = listOfCandidates[0];

            return listOfCandidates.map(data => {
                return {
                    userID: data.stdID,
                    name: data.name,
                    surname: data.surname,
                    department: data.department,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    imageUrl: data.imageUrl
                }
            })

        },
        // list of all posts of a social club
        gallery: async function (_, { scID }) {
            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social club not found');
                error.code = 404;
                throw error;
            }

            let gallery = await db.query('SELECT * FROM gallery WHERE scID=? ORDER BY createdAt DESC', [scID]);
            gallery = gallery[0];

            return gallery.map(data => {
                return {
                    postID: data.postID,
                    imageUrl: data.imageUrl,
                    description: data.description,
                    createdAt: data.createdAt.toISOString()
                }
            })
        },

        mealsList: async function () {
            let meals = await db.query('SELECT * FROM meals');
            meals = meals[0];
            if (!meals[0]) {
                const error = new Error('Meals not found');
                error.code = 404;
                throw error;
            }

            const desserts = [];
            const redMeals = [];
            const soups = [];
            const whiteMeals = [];
            const vegMeals = [];
            const salads = [];
            const all = [];

            meals.forEach(element => {
                let mealData = {
                    mealID: element.mealID,
                    mealType: element.mealType,
                    mealName: element.mealName,
                    mealImageUrl: element.mealImageUrl
                };
                if (element.mealType === "dessert") {
                    desserts.push(mealData);
                } else if (element.mealType === "redMeal") {
                    redMeals.push(mealData);
                } else if (element.mealType === "soup") {
                    soups.push(mealData);
                } else if (element.mealType === "whiteMeal") {
                    whiteMeals.push(mealData);
                } else if (element.mealType === "salad") {
                    salads.push(mealData);
                } else if (element.mealType === "vegMeal") {
                    vegMeals.push(mealData);
                } else {
                    soups.push(mealData);
                    redMeals.push(mealData);
                    whiteMeals.push(mealData);
                    vegMeals.push(mealData);
                    salads.push(mealData);
                    desserts.push(mealData);
                }

            });
            all.push(soups, redMeals, whiteMeals, vegMeals, salads, desserts);

            return all.map(meal => {
                return {
                    meals: meal.map(data => {
                        return {
                            mealID: data.mealID,
                            mealType: data.mealType,
                            mealName: data.mealName,
                            mealImageUrl: data.mealImageUrl
                        }
                    })
                }
            })
        },

        menu: async function (_) {

            const mon = [];
            const tue = [];
            const wed = [];
            const thu = [];
            const fri = [];
            const all = [];
            all.push(mon, tue, wed, thu, fri);

            const mealTypes = ['menu.soupID', 'menu.redMealID', 'menu.whiteMealID', 'menu.vegMealID', 'menu.saladID', 'menu.dessertID'];
            for (let i = 0; i < 6; i++) {
                var menu = await db.query('SELECT * FROM menu JOIN meals ON ??=meals.mealID', [mealTypes[i]]);
                menu = menu[0];
                if (!menu[0]) {
                    const error = new Error("Menu not found");
                    error.code = 404;
                    throw error;
                };

                for (let j = 0; j < 5; j++) {
                    const mealData = {
                        mealID: menu[j].mealID,
                        mealType: menu[j].mealType,
                        mealName: menu[j].mealName,
                        mealImageUrl: menu[j].mealImageUrl
                    }
                    all[j].push(mealData)
                }
            }

            return all.map(meals => {
                return {
                    meals: meals.map(data => {
                        return {
                            mealID: data.mealID,
                            mealType: data.mealType,
                            mealName: data.mealName,
                            mealImageUrl: data.mealImageUrl
                        }
                    })
                }
            })

        },

        noticeList: async function(_,{ userID }){
            let user = await db.query('SELECT * FROM students WHERE stdID=?',[userID]);
            user = user[0][0];
            if(!user){
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let noticeboard = await db.query('SELECT * FROM noticeboard JOIN students ON noticeboard.creator = students.stdID ORDER BY noticeID DESC');
            noticeboard = noticeboard[0];


            return noticeboard.map( notices => {
                return {
                    noticeID: notices.noticeID,
                    title: notices.title,
                    description: notices.description,
                    imageUrl: notices.imageURL,
                    creatorUserID: notices.creator,
                    creatorName: notices.name,
                    creatorSurname: notices.surname,
                    email: notices.contactEmail,
                    phone: notices.contactPhone,
                    createdAt: notices.createdAt.toISOString().slice(0, 10)
                }
            })
        }



    },

    RootMutation: {
        uploadAvatar: async function (_, { userID, image, typeOfUser }) {
            let userType;
            let idType;
            if (typeOfUser === 'Student') {
                userType = "students";
                idType = "stdID";
            } else {
                userType = "staff";
                idType = "staffID";

            }
            let user = await db.query('SELECT * FROM ?? WHERE ??=?', [userType, idType, userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 404;
                throw error;
            }

            let imageUrl = user.imageUrl;
            if (imageUrl && !imageUrl.includes(userDefaultImage)) {
                const deleteImage = await processDeleteCloudinary(imageUrl);
                if (!deleteImage) {
                    const error = new Error('Image delete failed');
                    throw error;
                }
            }

            imageUrl = await processUploadCloudinary(image.file);
            if (!imageUrl) {
                const error = new Error('Image upload failed');
                throw error;
            }

            let imageUrlInsert = await db.query('UPDATE ?? SET imageUrl=? WHERE ??=?', [userType, imageUrl, idType, userID]);
            if (imageUrlInsert[0].affectedRows < 1) {
                const error = new Error("Update image failed");
                throw error;
            }
            return imageUrl;
        },

        deleteAvatar: async function (_, { userID, typeOfUser }) {
            let userType;
            let idType;
            if (typeOfUser === 'Student') {
                userType = "students";
                idType = "stdID";
            } else {
                userType = "staff";
                idType = "staffID";

            }
            let user = await db.query('SELECT * FROM ?? WHERE ??=?', [userType, idType, userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 404;
                throw error;
            }

            let imageUrl = user.imageUrl;
            if (imageUrl && !imageUrl.includes(userDefaultImage)) {
                const deleteImage = await processDeleteCloudinary(imageUrl);
                if (!deleteImage) {
                    const error = new Error('Image delete failed');
                    throw error;
                }
                let defaultImage = await db.query('UPDATE ?? SET imageUrl=DEFAULT(imageUrl) WHERE ??=?', [userType, idType, userID]);
                if (defaultImage[0].affectedRows < 1) {
                    const error = new Error("Update image failed");
                    throw error;
                }

            } else if (imageUrl.includes(userDefaultImage)) {
                return "You dont have Image to delete..";
            }

            let newUser = await db.query('SELECT * FROM ?? WHERE ??=?', [userType, idType, userID]);
            newUser = newUser[0][0];
            if (!newUser) {
                const error = new Error('User not found');
                error.code = 404;
                throw error;
            }

            return newUser.imageUrl;

        },

        createEvent: async function (_, { userID, eventInput }, req) {

            var user = await db.execute('SELECT * FROM students JOIN socialClubs ON students.stdID=socialClubs.scoID WHERE stdID="' + userID + '"');
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }
            const file = eventInput.imageUrl.file;
            const title = eventInput.title;
            const description = eventInput.description;
            const creator = user.stdID;
            const price = eventInput.price;
            const organizer = user.title;
            const date = eventInput.date;
            const time = eventInput.time;
            const location = eventInput.location;
            const attendeeType = eventInput.attendee;
            const createdAt = new Date();

            const errors = [];
            if (validator.isEmpty(title) ||
                !validator.isLength(title, { min: 1 })
            ) {
                errors.push({ message: 'Title is invalid.' });
            }
            if (validator.isEmpty(description) ||
                !validator.isLength(description, { min: 1 })
            ) {
                errors.push({ message: 'Content is invalid.' });
            }
            if (validator.isEmpty(date) ||
                !validator.isLength(date, { min: 1 }) ||
                (new Date().toISOString().slice(0, 10)) > (date)
            ) {
                errors.push({ message: 'Date is invalid.' });
            }
            if (validator.isEmpty(time) ||
                !validator.isLength(time, { min: 1 })
                // !((time > "00:00") && (time < "24:00"))
            ) {
                errors.push({ message: 'Time is invalid.' });
            }
            if (validator.isEmpty(location) ||
                !validator.isLength(location, { min: 1 })
            ) {
                errors.push({ message: 'Location is invalid.' });
            }
            if (!file) {
                errors.push({ message: "Image is not provided" });
            }
            if (errors.length > 0) {
                const error = new Error('Invalid input');
                error.data = errors;
                error.code = 422;
                throw error;
            }
            let imageUrl = (await processUploadCloudinary(file));
            var insertedEventId;

            let insertEvent = await db.execute("INSERT INTO events(title, description, attendeeType, price, organizer, date, time, location, imageUrl, createdAt, creator) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                [title, description, attendeeType, price, organizer, date, time, location, imageUrl, createdAt, creator]
            );

            insertedEventId = insertEvent[0].insertId;
            await db.execute("INSERT INTO allEvents(eventID, title, description, attendeeType, price, organizer, date, time, location, imageUrl, createdAt, creator) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                [insertedEventId, title, description, attendeeType, price, organizer, date, time, location, imageUrl, createdAt, creator]
            );

            let createdEvent = await db.query('SELECT * FROM events JOIN attendeeTypes ON events.attendeeType=attendeeTypes.typeID WHERE eventID= "' + insertedEventId + '"');
            createdEvent = createdEvent[0][0];

            return {
                eventID: createdEvent.eventID,
                title: createdEvent.title,
                description: createdEvent.description,
                attendee: createdEvent.attendee,
                price: createdEvent.price,
                organizer: createdEvent.organizer,
                date: createdEvent.date.toISOString().slice(0, 10),
                time: createdEvent.time.substring(0, createdEvent.time.length - 3),
                location: createdEvent.location,
                imageUrl: createdEvent.imageUrl,
                createdAt: createdEvent.createdAt.toISOString(),
                creator: createdEvent.creator
            };
        },

        joinEvent: async function (_, { eventID, userID, typeOfUser }) {
            const now = new Date();
            let isJoined = await db.query('SELECT eventID FROM eventAttendee WHERE eventID=? AND userID=?', [eventID, userID]);
            isJoined = isJoined[0][0];
            if (isJoined) {
                const error = new Error('Already joined');
                error.code = 404;
                throw error;
            }

            let relationType;
            let idType;
            if (typeOfUser === 'Student') {
                relationType = "students";
                idType = "stdID";
            } else {
                relationType = "staff";
                idType = "staffID";
            }
            let user = await db.query('SELECT * FROM ?? WHERE ??=?', [relationType, idType, userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 404;
                throw error;
            }
            let event = await db.execute('SELECT * FROM events WHERE eventID="' + eventID + '"');
            event = event[0];
            if (!event.length) {
                const error = new Error('Event not found');
                error.code = 404;
                throw error;
            }
            // await db.query("CREATE TABLE IF NOT EXISTS ?? (attendeeID int primary key auto_increment not null, eventID int not null, userID int not null, name varchar(40), surname varchar(40), phone bigint(10))",
            //     [tableName]);

            let insertAttendee = await db.query('INSERT INTO eventAttendee (eventID, userID, joinedAt) VALUES(?,?,?)',
                [eventID, userID, now]
            );

            await db.query('INSERT INTO allEventsAttendee (eventID, userID, joinedAt) VALUES(?,?,?)',
                [eventID, userID, now]);

            let insertedAttendeeID = insertAttendee[0].insertId;
            let eventAttendee = await db.query('SELECT * FROM eventAttendee WHERE attendeeID=?', [insertedAttendeeID])
            eventAttendee = eventAttendee[0][0];
            if (!eventAttendee) {
                const error = new Error("Event not found");
                error.code = 404;
                throw error;
            }

            return {
                eventID: eventAttendee.eventID,
                userID: eventAttendee.userID,
                name: user.name,
                surname: user.surname,
                phone: user.phone,
                imageUrl: user.imageUrl,
                joinedAt: now
            };
        },

        cancelEvent: async function (_, { eventID, userID }) {
            let attendee = await db.query('SELECT * FROM eventAttendee WHERE eventID=? AND userID=?', [eventID, userID]);
            attendee = attendee[0][0];
            if (!attendee) {
                const error = new Error('Event not found');
                error.code = 404;
                throw error;
            };
            let deleteAttendee = await db.query('DELETE FROM eventAttendee WHERE attendeeID=?', [attendee.attendeeID]);
            await db.query('DELETE FROM allEventsAttendee WHERE attendeeID=?', [attendee.attendeeID]);
            if (deleteAttendee[0].affectedRows <= 0) {
                return false;
            }
            return true;
        },

        deleteEvent: async function (_, { eventID, userID }) {
            let event = await db.query('SELECT * FROM events WHERE eventID=? AND creator=?', [eventID, userID]);
            event = event[0][0];
            if (!event) {
                const error = new Error('Event not found');
                error.code = 404;
                throw error;
            }

            let isDeleted = await db.query('DELETE FROM events WHERE eventID=?', [eventID]);
            await db.query('DELETE FROM allEvents WHERE eventID=?', [eventID]);
            if (isDeleted[0].affectedRows <= 0) {
                return false;
            }
            return true;

        },

        editEvent: async function (_, { eventID, userID, eventInput }) {
            let oldEvent = await db.query('SELECT * FROM events WHERE eventID=? AND creator=?', [eventID, userID]);
            oldEvent = oldEvent[0][0];
            if (!oldEvent) {
                const error = new Error('User and/or event not found');
                error.code = 404;
                throw error;
            }
            let title = oldEvent.title;
            if (title != eventInput.title) {
                title = eventInput.title;
            }

            const description = eventInput.description;
            const price = eventInput.price;
            const date = eventInput.date;
            const time = eventInput.time;
            const location = eventInput.location;
            const attendeeType = eventInput.attendee;
            const createdAt = new Date();

            const errors = [];
            if (validator.isEmpty(title) ||
                !validator.isLength(title, { min: 1 })
            ) {
                errors.push({ message: 'Title is invalid.' });
            }
            if (validator.isEmpty(description) ||
                !validator.isLength(description, { min: 1 })
            ) {
                errors.push({ message: 'Content is invalid.' });
            }
            if (validator.isEmpty(date) ||
                !validator.isLength(date, { min: 1 }) ||
                (new Date().toISOString().slice(0, 10)) > (date)
            ) {
                errors.push({ message: 'Date is invalid.' });
            }
            if (validator.isEmpty(time) ||
                !validator.isLength(time, { min: 1 })
                // !((time > "00:00") && (time < "24:00"))
            ) {
                errors.push({ message: 'Time is invalid.' });
            }
            if (validator.isEmpty(location) ||
                !validator.isLength(location, { min: 1 })
            ) {
                errors.push({ message: 'Location is invalid.' });
            }
            if (errors.length > 0) {
                const error = new Error('Invalid input');
                error.data = errors;
                error.code = 422;
                throw error;
            }
            let imageUrl = eventInput.imageUrl;
            if (!imageUrl) {
                imageUrl = oldEvent.imageUrl;
            } else {
                await processDeleteCloudinary(oldEvent.imageUrl);
                imageUrl = await processUploadCloudinary(eventInput.imageUrl.file);
            }

            await db.query('UPDATE events SET title=?, description=?, attendeeType=?, price=?, date=?, time=?, location=?, imageUrl=?, createdAt=? WHERE eventID=?',
                [title, description, attendeeType, price, date, time, location, imageUrl, createdAt, oldEvent.eventID]);

            let updatedEvent = await db.execute('SELECT * FROM events JOIN attendeeTypes ON events.attendeeType=attendeeTypes.typeID WHERE eventID="' + eventID + '"');
            updatedEvent = updatedEvent[0][0];
            if (!updatedEvent) {
                const error = new Error('Event not found');
                error.code = 404;
                throw error;
            }

            await db.query('UPDATE allEvents SET title=?, description=?, attendeeType=?, price=?, date=?, time=?, location=?, imageUrl=?, createdAt=? WHERE eventID=?',
                [title, description, attendeeType, price, date, time, location, imageUrl, createdAt, oldEvent.eventID]);


            return {
                eventID: updatedEvent.eventID,
                title: updatedEvent.title,
                description: updatedEvent.description,
                attendee: updatedEvent.attendee,
                price: updatedEvent.price,
                organizer: updatedEvent.organizer,
                date: updatedEvent.date.toISOString().slice(0, 10),
                time: updatedEvent.time.substring(0, updatedEvent.time.length - 3),
                location: updatedEvent.location,
                imageUrl: updatedEvent.imageUrl,
                createdAt: updatedEvent.createdAt.toISOString(),
                creator: updatedEvent.creator
            };

        },

        uploadAvatarSocialClub: async function (_, { scID, userID, image }) {
            let hostSocialClub = await db.query('SELECT * FROM socialClubs WHERE scID=? AND scoID=?', [scID, userID]);
            hostSocialClub = hostSocialClub[0][0];
            if (!hostSocialClub) {
                const error = new Error('Social Club not found');
                error.code = 404;
                throw error;
            }
            let imageUrl = hostSocialClub.imageUrl;
            if (imageUrl && !imageUrl.includes(scDefaultImage)) {
                const deleteImage = await processDeleteCloudinary(imageUrl);
                if (!deleteImage) {
                    const error = new Error('Image delete failed');
                    throw error;
                }
            }

            imageUrl = await processUploadCloudinary(image.file);

            let updateHostSC = await db.query('UPDATE socialClubs SET imageUrl=? WHERE scID=?',
                [imageUrl, hostSocialClub.scID]);
            if (updateHostSC[0].affectedRows < 1) {
                const error = new Error("Update is failed");
                throw error;
            }

            return imageUrl;
        },

        deleteAvatarSocialClub: async function (_, { scID, userID }) {
            let hostSocialClub = await db.query('SELECT * FROM socialClubs WHERE scID=? AND scoID=?', [scID, userID]);
            hostSocialClub = hostSocialClub[0][0];
            if (!hostSocialClub) {
                const error = new Error('Social Club not found');
                error.code = 404;
                throw error;
            }

            let imageUrl = hostSocialClub.imageUrl;
            if (imageUrl && !imageUrl.includes(scDefaultImage)) {
                const deleteImage = await processDeleteCloudinary(imageUrl);
                if (!deleteImage) {
                    const error = new Error('Image delete failed');
                    throw error;
                }

                let defaultImage = await db.query('UPDATE socialClubs SET imageUrl=DEFAULT(imageUrl) WHERE scID=?', [scID]);
                if (defaultImage[0].affectedRows < 1) {
                    const error = new Error("Update image failed");
                    throw error;
                }
            } else if (imageUrl.includes(scDefaultImage)) {
                return "You dont have Image to delete...";
            }

            let defaultImageUrl = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);

            return defaultImageUrl[0][0].imageUrl;


        },

        editDescriptionSocialClub: async function (_, { scID, scoID, inputDescription }) {
            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=? AND scoID', [scID, scoID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social Club or Owner not found');
                error.code = 404;
                throw error;
            }

            if (!validator.isLength(inputDescription, { min: 5 })) {
                const error = new Error('Invalid input data');
                error.code = 422;
                throw error;
            }

            let updateSC = await db.query('UPDATE socialClubs SET description=? WHERE scID=?', [inputDescription, scID]);
            if (updateSC[0].affectedRows < 1) {
                const error = new Error('Update failed');
                throw error;
            }

            return true;

        },

        sendRequestJoinSocialClub: async function (_, { userID, scID }) {

            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let socialClub = await db.query('SELECt * FROM socialClubs WHERE scID=?', [scID]);
            socialClub = socialClub[0][0];
            if (socialClub.length <= 0) {
                const error = new Error('Social club not found');
                error.code = 404;
                throw error;
            }

            let isRequested = await db.query('SELECT * FROM socialClubsRequests WHERE scID=? AND userID=?', [scID, userID]);
            isRequested = isRequested[0][0];
            if (isRequested) {
                const error = new Error('Request is already sent!');
                throw error;
            }

            let isJoined = await db.query('SELECT * FROM socialClubsMembers WHERE scID=? AND userID=?', [scID, userID]);
            isJoined = isJoined[0][0];
            if (isJoined) {
                const error = new Error('Already joined');
                error.code = 400;
                throw error;
            }


            let insertRequest = await db.query('INSERT INTO socialClubsRequests(userID, scID) VALUES(?,?)', [user.stdID, socialClub.scID]);
            if (insertRequest[0].affectedRows < 1) {
                const error = new Error('Sending request failed');
                throw error;
            }


            return true;
        },

        cancelRequestJoinSocialClub: async function (_, { userID, scID }) {
            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error("Social Club not found");
                error.code = 404;
                throw error;
            }

            let isRequested = await db.query('SELECT * FROM socialClubsRequests WHERE scID=? AND userID=?', [scID, userID]);
            isRequested = isRequested[0][0];
            if (!isRequested) {
                const error = new Error('Request has not been sent..');
                throw error;
            }

            let deleteRequest = await db.query('DELETE FROM socialClubsRequests WHERE scID=? AND userID=?', [scID, userID]);
            if (deleteRequest[0].affectedRows < 1) {
                const error = new Error('Request deletion failed..');
                throw error;
            }

            return true;
        },

        acceptJoinSocialClub: async function (_, { scID, userID, scoID }) {
            let user = await db.query('SELECT * FROM socialClubsRequests JOIN students ON socialClubsRequests.userID = students.stdID WHERE userID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User or User Request not found');
                error.code = 401;
                throw error;
            }

            let socialClub = await db.query('SELECt * FROM socialClubs WHERE scID=? AND scoID=?', [scID, scoID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social club or Owner not found');
                error.code = 404;
                throw error;
            }

            let isCandidate = await db.query('SELECT * FROM socialClubsRequests WHERE userID=? AND scID=?', [userID, scID]);
            isCandidate = isCandidate[0][0];
            if (!isCandidate) {
                const error = new Error('User is not a candidate');
                error.code = 404;
                throw error;
            }

            const now = new Date();
            let isJoined = await db.query('SELECT * FROM socialClubsMembers WHERE scID=? AND userID=?', [scID, userID]);
            isJoined = isJoined[0][0];
            if (isJoined) {
                const error = new Error('Already joined');
                error.code = 400;
                throw error;
            }

            let scName = socialClub.title.replace(/\s+/g, '').toUpperCase();

            let insertedMember = await db.query('INSERT INTO ?? (userID, joinedAt) VALUES(?,?)',
                [scName, userID, now]);

            await db.query('INSERT INTO socialClubsMembers (scID, userID) VALUES(?,?)',
                [scID, userID]);

            let removeFromCandidates = await db.query('DELETE FROM socialClubsRequests WHERE userID=? AND scID=?', [userID, scID]);
            if (removeFromCandidates[0].affectedRows < 1) {
                const error = new Error('Removing failed');
                throw error;
            }

            insertedMemberID = insertedMember[0].insertId;
            if (insertedMemberID < 1) {
                const error = new Error('Insertion failed..');
                throw error;
            }

            const updateMembers = socialClub.members + 1;
            await db.query('UPDATE socialClubs SET members=? WHERE scID=?', [updateMembers, scID])

            let newSC = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);
            newSC = newSC[0][0];

            return {
                scID: newSC.scID,
                scoID: newSC.scoID,
                title: newSC.title,
                description: newSC.description,
                imageUrl: newSC.imageUrl,
                members: newSC.members
            }


        },

        denyJoinSocialClub: async function (_, { scID, userID, scoID }) {
            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=? AND scoID=?', [scID, scoID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error("Social Club or Owner not found");
                error.code = 404;
                throw error;
            }

            let isCandidate = await db.query('SELECT * FROM socialClubsRequests WHERE userID=? AND scID=?', [userID, scID]);
            isCandidate = isCandidate[0][0];
            if (!isCandidate) {
                const error = new Error('User is not a candidate');
                error.code = 404;
                throw error;
            }

            let removeFromCandidates = await db.query('DELETE FROM socialClubsRequests WHERE userID=? AND scID=?', [userID, scID]);
            if (removeFromCandidates[0].affectedRows < 1) {
                const error = new Error('Removing failed');
                throw error;
            }

            const message = "Dear " + user.name + " " + user.surname + ". Your request to join " + socialClub.title + " was denied."

            return message;
        },

        quitSocialClub: async function (_, { scID, userID }) {
            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social Club not found');
                error.code = 404;
                throw error;
            }

            let scName = socialClub.title.replace(/\s+/g, '').toUpperCase();
            let isMember = await db.query('SELECT * FROM ?? WHERE userID=?', [scName, userID]);
            isMember = isMember[0][0];
            if (!isMember) {
                const error = new Error('User is not a member of social club');
                throw error;
            }

            let deleteMember = await db.query('DELETE FROM ?? WHERE userID=?', [scName, userID]);
            if (deleteMember[0].affectedRows < 1) {
                const error = new Error('Deletion failed..')
                throw error;
            }

            const updateMembers = socialClub.members - 1;
            await db.query('UPDATE socialClubs SET members=? WHERE scID=?', [updateMembers, scID])

            let deleteFromAll = await db.query('DELETE FROM socialClubsMembers WHERE userID=? AND scID=?', [userID, scID]);
            if (deleteFromAll[0].affectedRows < 1) {
                const error = new Error('Deletion from all members failed');
                throw error;
            }

            return true;
        },
        // delete a member from social club, only owner of social club can delete
        deleteSCMember: async function (_, { userID, scoID, scID }) {

            let user = await db.query('SELECT * FROM students WHERE stdID=?', [userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 404;
                throw error;
            }

            let socialClub = await db.query('SELECt * FROM socialClubs WHERE scID=? AND scoID=?', [scID, scoID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social club or Owner not found');
                error.code = 404;
                throw error;
            }

            let scName = socialClub.title.replace(/\s+/g, '').toUpperCase();

            let scMember = await db.query('SELECT * FROM ?? WHERE userID=?', [scName, userID]);
            scMember = scMember[0][0]
            if (!scMember) {
                const error = new Error('Member not found');
                error.code = 404;
                throw error;
            }

            let allMembers = await db.query('SELECT * FROM socialClubsMembers WHERE scID=? AND userID=?', [scID, userID]);
            allMembers = allMembers[0][0];
            if (!allMembers) {
                const error = new Error('User is not a member');
                throw error;
            }

            let deleteFromSC = await db.query('DELETE FROM ?? WHERE memberID=?', [scName, scMember.memberID]);
            if (deleteFromSC[0].affectedRows < 1) {
                const error = new Error("Deletion from Social club failed");
                throw error;
            }
            const updateMembers = socialClub.members - 1;
            await db.query('UPDATE socialClubs SET members=? WHERE scID=?', [updateMembers, scID])

            let deleteFromAll = await db.query('DELETE FROM socialClubsMembers WHERE memberID=?', [allMembers.memberID]);
            if (deleteFromAll[0].affectedRows < 1) {
                const error = new Error('Deletion from all members failed');
                throw error;
            }

            let updatedSC = await db.query('SELECT * FROM socialClubs WHERE scID=?', [scID]);
            updatedSC = updatedSC[0][0];

            return {
                scID: updatedSC.scID,
                scoID: updatedSC.scoID,
                title: updatedSC.title,
                description: updatedSC.description,
                imageUrl: updatedSC.imageUrl,
                members: updatedSC.members
            }

        },

        uploadPost: async function (_, { postInput, scID, scoID }) {
            const now = new Date();

            let socialClub = await db.query('SELECT * FROM socialClubs WHERE scID=? AND scoID=?', [scID, scoID]);
            socialClub = socialClub[0][0];
            if (!socialClub) {
                const error = new Error('Social club or Owner not found');
                error.code = 404;
                throw error;
            }

            const imageUrl = await processUploadCloudinary(postInput.image.file);
            if (!imageUrl) {
                const error = new Error('Image upload failed..');
                throw error;
            }

            let insertPost = await db.query('INSERT INTO gallery(scID, imageUrl, description, createdAt) VALUES(?,?,?,?)',
                [scID, imageUrl, postInput.description, now]);
            if (insertPost[0].affectedRows < 1) {
                const error = new Error('Post insertion failed.. ');
                throw error;
            }

            const insertedID = insertPost[0].insertId;

            let galleryLastPost = await db.query('SELECT * FROM gallery WHERE postID=?', [insertedID]);
            galleryLastPost = galleryLastPost[0][0];
            if (!galleryLastPost) {
                const error = new Error('Post not found');
                error.code = 404;
                throw error;
            }

            return {
                postID: galleryLastPost.postID,
                imageUrl: galleryLastPost.imageUrl,
                description: galleryLastPost.description,
                createdAt: galleryLastPost.createdAt.toISOString()
            }

        },

        editPost: async function (_, { inputDescription, postID, scoID }) {
            let ownerSC = await db.query('SELECT * FROM socialClubs WHERE scoID=?', [scoID]);
            ownerSC = ownerSC[0][0];
            if (!ownerSC) {
                const error = new Error('Social club of user not found');
                error.code = 404;
                throw error;
            }

            if (!validator.isLength(inputDescription, { min: 5 })) {
                const error = new Error('Invalid input');
                error.code = 422;
                throw error;
            }

            let post = await db.query('SELECT * FROM gallery WHERE postID=? AND scID=?', [postID, ownerSC.scID]);
            post = post[0][0];
            if (!post) {
                const error = new Error('Post not found');
                error.code = 404;
                throw error;
            }

            let updatePost = await db.query('UPDATE gallery SET description=? WHERE postID=?', [inputDescription, postID]);
            if (updatePost[0].affectedRows < 1) {
                const error = new Error('Update failed');
                throw error;
            }

            let gallery = await db.query('SELECT * FROM gallery WHERE scID=? ORDER BY createdAt DESC', [ownerSC.scID]);
            gallery = gallery[0];
            if (!gallery[0]) {
                const error = new Error('Gallery not found');
                error.code = 404;
                throw error;
            }

            return gallery.map(data => {
                return {
                    postID: data.postID,
                    imageUrl: data.imageUrl,
                    description: data.description,
                    createdAt: data.createdAt.toISOString()
                }
            })
        },

        deletePost: async function (_, { postID, scoID }) {
            let ownerSC = await db.query('SELECT * FROM socialClubs WHERE scoID=?', [scoID]);
            ownerSC = ownerSC[0][0];
            if (!ownerSC) {
                const error = new Error('Social Club of user not found');
                error.code = 404;
                throw error;
            }

            let post = await db.query('SELECT * FROM gallery WHERE postID=? AND scID=?', [postID, ownerSC.scID]);
            post = post[0][0];
            if (!post) {
                const error = new Error('Post not found');
                error.code = 404;
                throw error;
            }

            let deleteImage = await processDeleteCloudinary(post.imageUrl);
            if (!deleteImage) {
                const error = new Error('Image deletion failed');
                throw error;
            }

            let deletePost = await db.query('DELETE FROM gallery WHERE postID=?', [postID]);
            if (deletePost[0].affectedRows < 1) {
                const error = new Error('Post deletion failed');
                throw error;
            }

            // let gallery = await db.query('SELECT * FROM gallery WHERE scID=? ORDER BY createdAt DESC', [ownerSC.scID]);
            // gallery = gallery[0];
            // if(!gallery[0]){
            //     const error = new Error('Gallery not found');
            //     error.code = 404;
            //     throw error;
            // }

            return true;
        },
        // create a meal and insert into database
        createMeal: async function (_, { userID, mealInput }) {
            const now = new Date();
            let user = await db.query('SELECT * FROM staff WHERE department=? AND staffID=?', ["Cook", userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            const errors = [];

            if (validator.isEmpty(mealInput.mealType)) {
                errors.push({ message: "Meal type is invalid" });
            }
            if (validator.isEmpty(mealInput.mealName)) {
                errors.push({ message: "Meal name is invalid" });
            }
            // if(validator.isEmpty(mealInput.mealImage)){
            //     errors.push({message: "Meal image is invalid"});
            // }

            if (errors.length > 0) {
                const error = new Error('Input data is invalid')
                error.code = 422;
                throw error;
            }

            let isUniqueName = await db.query('SELECT * FROM meals WHERE mealName=?', [mealInput.mealName]);
            isUniqueName = isUniqueName[0];
            if (isUniqueName.length > 0) {
                const error = new Error('Meal is already inserted');
                throw error;
            }

            const imageUrl = await processUploadCloudinary(mealInput.mealImage.file);

            let insertedMeal = await db.query('INSERT INTO meals(mealType, mealName, mealImageUrl, createdAt) VALUES(?, ?, ?, ?)',
                [mealInput.mealType, mealInput.mealName, imageUrl, now]);
            if (insertedMeal[0].affectedRows < 1) {
                return false;
            }

            return true;
        },
        // delete meal from database
        deleteMeal: async function (_, { userID, mealName }) {
            let user = await db.query('SELECT * FROM staff WHERE department=? AND staffID=?', ["Cook", userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let meal = await db.query('SELECT * FROM meals WHERE mealName=?', [mealName]);

            if (meal[0].length != 1) {
                const error = new Error('Meal is invalid');
                throw error;
            }
            meal = meal[0][0];

            const deleteImage = await processDeleteCloudinary(meal.mealImageUrl);
            if (!deleteImage) {
                const error = new Error('Image deletion failed');
                throw error;
            }

            let deleteMeal = await db.query('DELETE FROM meals WHERE mealName=?', [mealName]);
            if (deleteMeal[0].affectedRows < 1) {
                return false;
            }

            return true;
        },
        //choose meals from database and make a menu
        chooseMeals: async function (_, { userID, menuInput }) {
            let user = await db.query('SELECT * FROM staff WHERE department=? AND staffID=?', ["Cook", userID]);
            user = user[0][0];
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }
            let menuDay = await db.query('SELECT * FROM menu WHERE dayID=?', [menuInput.dayID]);
            menuDay = menuDay[0][0];
            if (!menuDay) {
                const error = new Error('Invalid Day ID');
                throw error;
            }

            for (let [key, value] of Object.entries(menuInput)) {
                let mealName;
                if (key === 'dayID') {
                    continue;
                } else {
                    mealName = key + 'ID';
                    let updateMenu = await db.query('UPDATE menu SET ??=? WHERE dayID=?',
                        [mealName, parseInt(value), menuDay.menuID]);
                    if (updateMenu[0].affectedRows < 1) {
                        const error = new Error('Update menu failed');
                        throw error;
                    }
                }
            }

            return true;

        },

        createNotice: async function (_, { userID, noticeInput }){
            let user = await db.query('SELECT * FROM students WHERE stdID=?',[userID]);
            user = user[0][0];
            if(!user){
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }
            const now = new Date();
            const title = noticeInput.title;
            const description = noticeInput.description;
            const image = noticeInput.image.file;
            let phone = noticeInput.phone;
            if(!phone){
                phone = 'nonumber';
            }

            let email = noticeInput.email;
            if(!email){
                email = user.email;
            }

            const errors = [];
            if(validator.isEmpty(title)){
                errors.push({message: 'Title is invalid'});
            }
            if(validator.isEmpty(description)){
                errors.push({message: 'Description is invalid'});
            }

            if(errors.length > 0){
                const error = new Error("Invalid input");
                error.code = 422;
                throw error;
            }

            const imageUrl = await processUploadCloudinary(image);
            if(!imageUrl){
                const error = new Error("Image upload failed");
                throw error;
            }

            let insertNotice = await db.query('INSERT INTO noticeboard(title, description, imageURL, creator, contactEmail, contactPhone, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?)',
            [title, description, imageUrl, userID, email, phone, now]);
            if(insertNotice[0].affectedRows < 1){
                const error = new Error('Insert notice failed');
                throw error;
            }

            const insertedID = insertNotice[0].insertId;

            let newNotice = await db.query('SELECT * FROM noticeboard WHERE noticeID=?', [insertedID]);
            newNotice = newNotice[0][0];
            if(!newNotice){
                const error = new Error('Notice not found');
                throw error;
            }

            return {
                noticeID: newNotice.noticeID,
                title: newNotice.title,
                description: newNotice.description,
                imageUrl: newNotice.imageURL,
                creatorUserID: newNotice.creator,
                creatorName: user.name,
                creatorSurname: user.surname,
                email: newNotice.contactEmail,
                phone: newNotice.contactPhone,
                createdAt: newNotice.createdAt.toISOString().slice(0, 10)
            }
        },
         
        deleteNotice: async function(_, { userID, noticeID }){
            let user = await db.query('SELECT * FROM students WHERE stdID=?',[userID]);
            user = user[0][0];
            if(!user){
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let notice = await db.query('SELECT * FROM noticeboard WHERE noticeID=? AND creator=?',[noticeID, userID]);
            notice = notice[0][0];
            if(!notice){
                const error = new Error('Notice not found');
                error.code = 404;
                throw error;
            }

            await processDeleteCloudinary(notice.imageURL);

            let deleteNotice = await db.query('DELETE FROM noticeboard WHERE noticeID=?',[noticeID]);
            if(deleteNotice[0].affectedRows < 1){
                const error = new Error('Delete notice failed');
                throw error;
            }

            return true;

        },

        editNotice: async function(_, { userID, noticeInput, noticeID }){
            let user = await db.query('SELECT * FROM students WHERE stdID=?',[userID]);
            user = user[0][0];
            if(!user){
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }

            let oldNotice = await db.query('SELECT * FROM noticeboard WHERE noticeID=?',[noticeID]);
            oldNotice = oldNotice[0][0];
            if(!oldNotice){
                const error = new Error('Notice not found');
                error.code = 404;
                throw error;
            }

            const title = noticeInput.title;
            const description = noticeInput.description;
            let image = noticeInput.image;
            let email = noticeInput.email;
            if(!email){
                email = oldNotice.email;
            }
            let phone = noticeInput.phone;
            if(!phone){
                phone = oldNotice.phone;
            }

            if(!image){
                image = oldNotice.imageURL;
            }else{
                await processDeleteCloudinary(oldNotice.imageURL);
                image = await processUploadCloudinary(image.file);
            }

            let updateNotice = await db.query('UPDATE noticeboard SET title=?, description=?, imageURL=?, contactEmail=?, contactPhone=? WHERE noticeID=?',
            [title, description, image, email, phone, noticeID]);
            
            if(updateNotice[0].affectedRows < 1){
                const error = new Error('Update notice failed');
                throw error;
            }
            
            let newNotice = await db.query('SELECT * FROM noticeboard WHERE noticeID=?', [noticeID]);
            newNotice = newNotice[0][0];
            if(!newNotice){
                const error = new Error('Notice not found');
                throw error;
            }

            return {
                noticeID: newNotice.noticeID,
                title: newNotice.title,
                description: newNotice.description,
                imageUrl: newNotice.imageURL,
                creatorUserID: newNotice.creator,
                creatorName: user.name,
                creatorSurname: user.surname,
                email: newNotice.contactEmail,
                phone: newNotice.contactPhone,
                createdAt: newNotice.createdAt.toISOString().slice(0, 10)
            }
        }

    }
}

module.exports = resolvers;





        // createMenu: async function (_, { menuInput, userID }) {
        //     let cook = await db.query('SELECT * FROM staff WHERE staffID=?', [userID]);
        //     cook = cook[0][0];
        //     if (!cook) {
        //         const error = new Error('User is not found');
        //         error.code = 404;
        //         throw error;
        //     }

        //     const dayID = menuInput.dayID;
        //     const redMeal = menuInput.redMeal;
        //     const whiteMeal = menuInput.whiteMeal;
        //     const vegMeal = menuInput.vegMeal;
        //     const soup = menuInput.soup;
        //     const salad = menuInput.salad;
        //     const dessert = menuInput.dessert;

        //     const errors = [];
        //     if (validator.isEmpty(dayID)) {
        //         errors.push("Day ID is invalid");
        //     }
        //     if (validator.isEmpty(redMeal)) {
        //         errors.push("Red Meal is invalid");
        //     }
        //     if (validator.isEmpty(whiteMeal)) {
        //         errors.push("White Meal is invalid");
        //     }
        //     if (validator.isEmpty(vegMeal)) {
        //         errors.push("Veg Meal is invalid");
        //     }
        //     if (validator.isEmpty(soup)) {
        //         errors.push("Soup is invalid");
        //     }
        //     if (validator.isEmpty(salad)) {
        //         errors.push("Salad is invalid");
        //     }
        //     if (validator.isEmpty(dessert)) {
        //         errors.push("Dessert is invalid");
        //     }
        //     if (errors.length > 0) {
        //         const error = new Error("Invalid input");
        //         error.code = 422;
        //         throw error;
        //     }
        //     let menuID;
        //     let oldMenu = await db.query('SELECT * FROM menu WHERE dayID=?',[dayID]);
        //     oldMenu = oldMenu[0][0];
        //     if (oldMenu) {
        //         menuID = oldMenu.menuID;
        //         let updateMenu = await db.query('UPDATE menu SET redMeal=?, whiteMeal=?, vegMeal=?, soup=?, salad=?, dessert=? WHERE menuID=?',
        //         [redMeal, whiteMeal, vegMeal, soup, salad, dessert, menuID]);
        //         if(updateMenu[0].affectedRows<1){
        //             const error = new Error('Create menu is failed');
        //             throw error;
        //         }

        //     } else {

        //         let insertMenu = await db.execute('INSERT INTO menu (dayID, redMeal, whiteMeal, vegMeal, soup, salad, dessert) VALUES(?,?,?,?,?,?,?)',
        //             [dayID, redMeal, whiteMeal, vegMeal, soup, salad, dessert]);
        //         menuID = insertMenu[0].insertId;
        //     }
        //     let menu = await db.execute('SELECT * FROM menu JOIN days ON menu.dayID = days.ID WHERE menuID="' + menuID + '"');
        //     menu = menu[0][0];
        //     if (!menu) {
        //         const error = new Error("Menu is not found! ");
        //         error.code = 401;
        //         throw error;
        //     }

        //     return {
        //         menuID: menu.menuID,
        //         dayID: menu.dayID,
        //         day: menu.day,
        //         redMeal: menu.redMeal,
        //         whiteMeal: menu.whiteMeal,
        //         vegMeal: menu.vegMeal,
        //         soup: menu.soup,
        //         salad: menu.salad,
        //         dessert: menu.dessert
        //     };
        // },
        //const isEqual = bcrypt.compare(password, user.password);