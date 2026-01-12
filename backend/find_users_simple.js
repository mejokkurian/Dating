const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkUsers = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is undefined');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const ids = [
            '6960ff61fed2d84f5410095c',
            '69622f4f9940756635499afc' 
        ];

        const users = await User.find({ _id: { $in: ids } });
        
        users.forEach(u => {
            console.log(`ID: ${u._id} | Email: ${u.email} | Name: ${u.displayName}`);
        });

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUsers();
