const aws = require('aws-sdk');

aws.config.update({
    secretAccessKey: 'zzKZPMrL3fZM7rEmCYDFSjkC/un+UVq3vS296Er7',
    accessKeyId: 'AKIAWCHTBDSVNKQCM64H',
    region: 'eu-central-1'
});

const s3 = new aws.S3();

module.exports = s3


// const processUploadS3 = async (file) => {
//     if (!(file.mimetype === 'image/jpeg' ||
//         file.mimetype === 'image/jpg' ||
//         file.mimetype === 'image/png')
//     ) {
//         const error = new Error('Invalid image type');
//         error.code = 422;
//         throw error;
//     }
//     const { createReadStream, mimetype, filename } = await file;
//     const params = {
//         Bucket: 'campus-app-images',
//         Key: `${uuid()}${filename}`,
//         Body: createReadStream(),
//         ContentType: mimetype,
//         ACL: 'public-read'
//     }
//     const { Location } = await s3.upload(params).promise();
//     if (Location) {
//         return { message: "File stored", location: Location };
//     }
//     return { message: "File storing failed" };
// }


// const processUploadLocal = async (file)=>{
//     const {createReadStream, mimetype, encoding, filename} = await file;
//     let path = "uploads/" + uuid() + filename;
//     let stream = createReadStream();
//     return new Promise((resolve,reject)=>{
//         stream
//         .pipe(fs.createWriteStream(path))
//         .on("finish", ()=>{

//             resolve({
//                 success: true,
//                 message: "Successfully Uploaded",
//                 mimetype, filename, encoding, location: path
//             })
//         })
//         .on("error", (err)=>{
//             console.log("Error Event Emitted")
//             reject({
//                 success: false,
//                 message: "Failed"
//             })
//         })
//     })
// }