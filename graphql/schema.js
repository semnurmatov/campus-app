// const { buildSchema } = require('graphql');
const { gql } = require('apollo-server-express');

const typeDefs = gql`
    scalar Upload

    type NoticeData {
        noticeID: ID!
        title: String!
        description: String!
        imageUrl: String!
        creatorUserID: ID!
        creatorName: String!
        creatorSurname: String!
        phone: String
        email: String!
        createdAt: String!
    }

    type GalleryData {
        postID: ID
        imageUrl: String!
        description: String!
        createdAt: String
    }

    type SocialClubMembers {
        userID: String!
        name: String!
        surname: String!
        imageUrl: String
    }

    type SocialClub {
        scID: ID!
        scoID: ID!
        title: String!
        description: String!
        imageUrl: String!
        members: Int!
        status: String
    }

    type AttendeeData {
        count: Int
        userID: ID!
        eventID: ID!
        name: String!
        surname: String!
        phone: Float!
        imageUrl: String
        joinedAt: String!
    }

    type Meal {
        mealID: ID!
        mealType: String!
        mealName: String!
        mealImageUrl: String!
    }

    type MealsData {
        meals: [Meal!]
    }

    type Menu {
        menuID: ID
        dayID: ID!
        soup: Meal
        redMeal: Meal
        whiteMeal: Meal
        vegMeal: Meal
        salad: Meal
        dessert: Meal
    }

    type CourseData {
        day: String!
        courseCode: String!
        courseName: String!
        time: String!
        location: String!
        lecturer: String!
    }

    type Event {
        eventID: ID!
        title: String!
        description: String!
        attendee: String!
        price: String!
        organizer: String!
        date: String!
        time: String!
        location: String!
        imageUrl: String!
        createdAt: String!
        creator: String!
    }

    type User {
        userID: ID!
        name: String!
        surname: String!
        gender: String
        title: String
        department: String!
        email: String!
        address: String!
        phone: Float!
        imageUrl: String
        balance: Float
        semester: Int
    }

    type AuthData {
        typeOfUser: String!
        userID: ID!
        socialClub: String!
        name: String!
        surname: String!
        email: String!
        phone: String!
        imageUrl: String!
    }

    input NoticeInputData {
        title: String!
        description: String!
        image: Upload
        phone: String
        email: String
    }

    input PostInputData {
        image: Upload!
        description: String!
    }

    input MealInputData {
        dayID: ID
        mealType: String!
        mealName: String!
        mealImage: Upload
    }

    input MenuInputData {
        dayID: ID!
        soup: ID!
        redMeal: ID!
        whiteMeal: ID!
        vegMeal: ID!
        salad: ID!
        dessert: ID!
    }

    input EventInputData {
        title: String!
        description: String!
        attendee: Int!
        price: String!
        date: String!
        time: String!
        location: String!
        imageUrl: Upload
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        profile(userID: ID!, typeOfUser: String!):  User!
        timetable(userID: ID!, typeOfUser: String!): [CourseData!]
        events(userID: ID!, typeOfUser: String!):[Event!]
        hostEvents(userID: ID!): [Event!]
        myEvents(userID: ID!,): [Event!]
        socialClubEvents(userID: ID!): [Event!]
        listOfAttendees(eventID: ID!): [AttendeeData!]
        socialClubs: [SocialClub!]
        socialClub(scID: ID!, userID: ID!): SocialClub!
        mySocialClubs(userID: ID!): [SocialClub!]
        hostSocialClub(userID: ID!): SocialClub!
        socialClubMembers(scID: ID!): [SocialClubMembers!]
        socialClubRequests(userID: ID!): [User!]
        gallery(scID: ID!): [GalleryData!]
        mealsList: [MealsData!]
        menu: [MealsData!]
        noticeList(userID: ID!): [NoticeData!]
    }

    type RootMutation {
        uploadAvatar(userID: ID!, image: Upload!, typeOfUser: String!): String!
        deleteAvatar(userID: ID!, typeOfUser: String!): String!
        createEvent(eventInput: EventInputData, userID: ID!): Event!
        joinEvent(eventID: ID!, userID: ID!, typeOfUser: String!): AttendeeData!
        cancelEvent(eventID: ID!, userID: ID!): Boolean!
        editEvent(eventID: ID!, userID: ID!, eventInput: EventInputData): Event!
        deleteEvent(eventID: ID!, userID: ID!): Boolean!
        uploadAvatarSocialClub(scID: ID!, userID: ID!, image: Upload!): String!
        deleteAvatarSocialClub(scID: ID!, userID: ID!): String!
        editDescriptionSocialClub(scID: ID!, scoID: ID!, inputDescription: String!): Boolean!
        sendRequestJoinSocialClub(userID: ID!, scID: ID!): Boolean!
        cancelRequestJoinSocialClub(userID: ID!, scID: ID!): Boolean!
        acceptJoinSocialClub(scID: ID!, userID: ID!, scoID: ID!): SocialClub!
        denyJoinSocialClub(scID: ID!, userID: ID!, scoID: ID!): String!
        quitSocialClub(scID: ID!, userID: ID!): Boolean!
        deleteSCMember(userID: ID!, scoID: ID!, scID: ID!): SocialClub!
        uploadPost(postInput: PostInputData, scID: ID!, scoID: ID!): GalleryData!
        deletePost(postID: ID!, scoID: ID!): Boolean!
        editPost(inputDescription: String!, postID: ID!, scoID: ID!): [GalleryData!]
        createMeal(mealInput: MealInputData, userID: ID!): Boolean!
        chooseMeals(menuInput: MenuInputData, userID: ID!): Boolean!
        deleteMeal(userID: ID!, mealName: String!): Boolean!
        createNotice(userID: ID!, noticeInput: NoticeInputData!): NoticeData!
        deleteNotice(userID: ID!, noticeID: ID!): Boolean!
        editNotice(userID: ID!, noticeInput: NoticeInputData!, noticeID: ID!): NoticeData!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`;





module.exports = typeDefs;