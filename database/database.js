const firebase = require('firebase/app')
const firestore = require('firebase/firestore')


const firebaseConfig = {
    apiKey: "AIzaSyCg-oj1lN3nKaSdGNJMEnXA22VVYe9UrKA",
    authDomain: "database-f3f20.firebaseapp.com",
    databaseURL: "https://database-f3f20-default-rtdb.firebaseio.com",
    projectId: "database-f3f20",
    storageBucket: "database-f3f20.appspot.com",
    messagingSenderId: "233530587453",
    appId: "1:233530587453:web:16d10f0951081ea25b6d54",
    measurementId: "G-KRHGS27J40"
  };

  let userId = '00'


  // Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firestore.getFirestore();

const getUser = async () => {
    const docRef = firestore.doc(db, "users", userId);
    const doc = await firestore.getDoc(docRef);

    return doc.data();
}

const setUser = async (user, id = userId) => {
    if(userId != id){
        userId = id;
    }
    const userRef = firestore.doc(db, 'users', userId);
    await firestore.setDoc(userRef, user, { merge: true });  
}

module.exports = {
    getUser,
    setUser
}