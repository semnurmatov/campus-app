const cloudinary = require('cloudinary');

cloudinary.config({
    cloud_name:'abu-campus-app',
    api_key: '352286638168552',
    api_secret: 'vZXszYP5oldacW9QarLuBahKH7E'
});


module.exports = cloudinary;