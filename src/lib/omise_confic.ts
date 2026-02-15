import Omise from "omise";
const omise = Omise({
    'secretKey': process.env.OMISE_SECRET_KEY,
    'omiseVersion': '2019-05-15'
})

export default omise