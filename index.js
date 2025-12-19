const express = require('express')
var cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SECRET);



const port = process.env.PORT || 3000

const admin = require("firebase-admin");

const serviceAccount = require("./digital-life-lessons-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


function generateTrackingId() {
  const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `PK-${date}-${random}`;
}


// middleware
app.use(express.json())
app.use(cors())

const verifyFBToken = async (req, res, next)=>{
  console.log('verify fb token', req.headers.authorization)
  const token = req.headers.authorization;
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }

  try{
    const idToken = token.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log('decoded in the token', decoded)
    req.decoded_email = decoded.email;

    next();
  }

  catch(error){
    return res.status(401).send({massage: 'unauthorized access'})
  }

  
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h1evre0.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('Life is going furut furut')
})

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("digital_life_lessons");
    const lessonsCollection = database.collection("lessons");
    const usersCollection = database.collection("users");
    const paymentsCollection = database.collection("payments");
    const ReportLessonCollection = database.collection('reportLessons')
    const commentCollection = database.collection('comment')


    //middle admin before admin activity 
    const verifyAdmin = async (req, res, next)=>{
      const email = req.decoded_email;
      const query = {email}
      const user= await usersCollection.findOne(query)

      if(!user || user.role !== 'admin'){
        return res.status(403).send({massage: 'forbidden access'})
      }

      next()
    }

    // report Lessons post
app.post('/reportLessons', verifyFBToken, async (req, res) => {
  const report = {...req.body,
    timestamp: new Date()
  };

  const result = await ReportLessonCollection.insertOne(report);
  res.send(result);
});





    //comment post db
    app.post('/comment', async(req, res)=>{
      const comment = req.body;
      const result = await commentCollection.insertOne(comment)

      res.send(result)
    })

    //comment get db
    app.get('/comments', async (req, res) => {
  const lessonId = req.query.lessonId;

  const query = { commentLessonId: lessonId };
  const result = await commentCollection.find(query).toArray();

  res.send(result);
});

    //payment related api
    app.post('/create-checkout-session', async (req, res) => {
      const paymentInfo = req.body;
      // const amount = parseInt(paymentInfo.cost)*100
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, price_1234) of the product you want to sell
        price_data:{
          currency: 'BDT',
          unit_amount: 1500 * 100,
          // unit_amount: amount

          product_data:{
            name: "Premium Plan"
          }
        },
        quantity: 1,
      },
    ],
    customer_email: paymentInfo.buyerEmail,
    mode: 'payment',
    metadata: {
      userId: paymentInfo.userId,
      name: "Premium Plan"
    },
    success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
  });

  // res.redirect(303, session.url);
  res.send({url: session.url})
});

    app.patch('/payment-success',  async (req, res) => {
    const sessionId = req.query.session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(session);

    const transactionId = session.payment_intent;
    const query = {transactionId: transactionId};

    const paymentExists = await paymentsCollection.findOne(query);
    if(paymentExists){
      return res.send({
        success: true, 
        massage: 'Payment already processed',
      transactionId,
      trackingId: paymentExists.trackingId
      })
    }

      const trackingId = generateTrackingId();

    if(session.payment_status === 'paid'){
      const id = session.metadata.userId;
      const query = {_id: new ObjectId(id)};
      const update = {
        $set: {
          isPremium: true,
          trackingId: trackingId,
        },
      };
      const result = await usersCollection.updateOne(query, update);

      const payment = {
        amount: session.amount_total / 100,
        currency: session.currency,
        customer_email: session.customer_email,
        userId: session.metadata.userId,
        name: session.metadata.name,
        transactionId: session.payment_intent,
        payment_status: session.payment_status,
        paidAt: new Date(),
        
      }

      if(session.payment_status === 'paid'){
        const resultPayment = await paymentsCollection.insertOne(payment);
        res.send({
          success: true, 
          modifyParcel: result,
          transactionId: session.payment_intent,
          trackingId: trackingId,
          paymentInfo: resultPayment}) 
      }



    }

    res.send({success: false})
    })


    //payment get api
    app.get('/payments', verifyFBToken,  async (req, res) => {
      const email = req.query.email;
      const query ={}

      // console.log(req.headers)



      if(email){
        query.customer_email = email;

        //check email address
        if(email !== req.decoded_email){
          return res.status(403).send({massage: 'forbidden access'})
        }
      }

      const cursor = paymentsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
      
    })




    // users api
    app.post('/users', async (req, res) => {
      const user = req.body;
      user.role = 'user';
      user.createdAt = new Date();
      const email = user.email;

      const userExists = await usersCollection.findOne({email});

      if(userExists){
        return res.send({massage: 'User already exists'})
      }

      const result = await usersCollection.insertOne(user)
      res.send(result);
      // const result = await usersCollection.insertOne(user)

      // if(userExists){
      //   return res.send({message: 'User already exists'})
      // }
      // res.send(result);
    })

    // app.get('/users/:id', async(req,res)=>{
    //   const query = {}
    //   const {userId} = req.query;
    //   if(userId){
    //     query.uid = userId
    //   }
    //   const result = await usersCollection.findOne(query)
    //   res.send(result)
    // })

    app.get('/users/:email/role',async(req, res)=>{
      const email = req.params.email;
      const query = {email}
      const user = await usersCollection.findOne(query)
      res.send({role:user?.role || 'user'})
    })

    app.get('/users', verifyFBToken,  async (req, res) => {
      const query = {}
      const {email, id} = req.query;
      if(email){
        query.email = email;
      }

      if(id){
        query._id  = new ObjectId(id)
      }

      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);

    })

    app.get('/users/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch('/users/:id/role', verifyFBToken,verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const roleInfo = req.body;
      const query = { _id: new ObjectId(id)}
      const updatedDoc = {
        $set:{
          role: roleInfo.role
        }
      }
      const result = await usersCollection.updateOne(query, updatedDoc)
      res.send(result)
    })


    //all lessons by a user
app.get('/users/:id/lessons', async (req, res) => {
  const userId = req.params.id;
  const lessons = await lessonsCollection.find({ mongoUserId: userId }).toArray();
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

  res.send({user,lessons});
});




    // lessons api
    app.get('/lessons', async (req, res) => {
      const query = {};

      const {email} = req.query;

      if(email){
        query.email = email;
      }

      const options = { sort: {createdAt: -1}}

      const cursor = lessonsCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/lessons', async (req, res) => {
      const query = {status: 'pending'};
      const cursor = lessonsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

//     app.get('/lessons', async (req, res) => {
//   const query = {};
//   const { email, status, privacy } = req.query;

//   if (email) query.email = email;
//   if (status) query.status = status;
//   if (privacy) query.privacy = privacy;

//   const options = { sort: { createAt: -1 } };
//   const result = await lessonsCollection.find(query, options).toArray();

//   res.send(result);
// });



    app.get('/lessons/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await lessonsCollection.findOne(query)
      
      res.send(result)
    })


    //like 
    app.patch('/lessons/:id/like', verifyFBToken, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const lesson = await lessonsCollection.findOne({ _id: new ObjectId(id) });
  const isLiked = lesson.likes?.includes(userId);
  const update = isLiked
    ? 
    {
        $pull: { likes: userId },$inc: { likesCount: -1 }
      }
    : 
    {
        $addToSet: { likes: userId },$inc: { likesCount: 1 }
      };

  const result = await lessonsCollection.updateOne(
    { _id: new ObjectId(id) },update);

  res.send(result);
});

  //favourite
  app.patch('/lessons/:id/favorite', verifyFBToken, async (req, res) => {
  const { userId } = req.body;
  const { id } = req.params;
  const lesson = await lessonsCollection.findOne({ _id: new ObjectId(id) });
  const isSaved = lesson.favorites?.includes(userId);
  const update = isSaved
    ? {
        $pull: { favorites: userId },$inc: { favoritesCount: -1 }
      }
    : {
        $addToSet: { favorites: userId }, $inc: { favoritesCount: 1 }
      };

  const result = await lessonsCollection.updateOne(
    { _id: new ObjectId(id) }, update
  );

  res.send(result);
});

  

    app.post('/lessons', async (req, res) => {
      const lesson = req.body;
      lesson.status= 'pending';
      lesson.createAt= new Date();
      const result = await lessonsCollection.insertOne(lesson)
      res.send(result);
    })


    // app.delete('/lessons/:id', async (req, res) =>{
    //   const id = req.params.id;
    //   const query = {_id: new ObjectId(id)}
    //   const result = await lessonsCollection.deleteOne(query);
    //   res.send(result);
    // })

    app.get('/lessons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };

    const lesson = await lessonsCollection.findOne(query);

    if (!lesson) {
      return res.status(404).send({ message: 'Lesson not found' });
    }

    res.send(lesson);
  } catch (error) {
    res.status(400).send({ message: 'Invalid lesson ID' });
  }
});


  app.patch('/lessons/:id', async)

    app.patch('/lessons/:id', verifyFBToken,verifyAdmin, async (req, res) =>{
      const status = req.body.status;
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set:{
          status: status,
        }
      }
      const result = await lessonsCollection.updateOne(query, updatedDoc);

      // if(status === 'approved'){
      //   const email = req.body.email;
      //   const userQuery = {email: email};
      //   const updateUser = {
      //     $set:{
      //       role:
      //     }
      //   }
      // }

      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
