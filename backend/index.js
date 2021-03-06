const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./models/user.model");
const Tweet = require("./models/tweet.model");
require("dotenv").config();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_DB_URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});
mongoose.connection.once("open", () => {
  console.log("MongoDB connected");
});
/*
Create routes in the following format. Replace things indicated by ##:
app.#whatever your http req is#('/#address of whatever (e.g. /getUserTweets)#', () => {
    do your actions here. If you need to connect to mongoDB you need to a have a schema in the models folder.
})

*/
//START OF ROUTES
app.post("/createUser", async (req, res) => {
  // error checking
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json("Required username / password not in body");

  const cur = await User.findOne({ username: username });
  if (cur) return res.status(200).json("Username already exists");

  const newUser = new User({
    username: username,
    password: password,
  });

  newUser.save().catch((err) => res.status(400).json(err));

  console.log(`Successfully created ${newUser}`);
  return res.status(200).json({ newUser });
});

app.post("/loginUser", async (req, res) => {
  // error checking
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json("Required username / password not in body");

  const cur = await User.findOne({ username: username });

  if (!cur) return res.status(200).json("user doesn't exist");

  let validLogin;
  console.log(cur);
  password === cur.password ? (validLogin = true) : (validLogin = false);

  console.log(validLogin);
  validLogin
    ? res.status(200).json(cur)
    : res.status(200).json("incorrect password");
});

app.delete("/deleteAllUsers", async (req, res) => {
  User.deleteMany({})
    .then((data) => res.status(200).json(data))
    .catch((err) => console.log(err));
});

app.delete("/deleteAllTweets", async (req, res) => {
  Tweet.deleteMany({})
    .then((data) => res.status(200).json(data))
    .catch((err) => console.log(err));
});


app.get("/getAllUsers", async (req, res) => {
  User.find({})
    .then((data) => console.log(data))
    .catch((err) => console.log(err));
});
app.post("/createTweet", async (req, res) => {
  const newTweet = await new Tweet({
    title: req.body.data.title,
    body: req.body.data.body,
    tags: req.body.data.tags,
  });
  newTweet.save().catch((err) => res.status(401).json(err));
  User.findOneAndUpdate(
    { _id: req.body.data.userId },
    { $push: { tweets: newTweet._id } }
  )
    .then((user) => res.status(200).json(user))
    .catch((err) => res.status(400).json(err));
});

app.get("/getAllTweets", async (req, res) => {
  Tweet.find({})
    .then((data) => res.status(200).json(data))
    .catch((err) => console.log(err));
});

app.get("/searchTweets/:tag", async (req, res) => {
  Tweet.find({ tags: req.params.tag })
    .then((data) => res.status(200).json(data))
    .catch((err) => console.log(err));
});

app.get("/getUserByName/:username", async (req, res) => {
  User.find({ username: req.params.username })
    .then((data) => res.status(200).json(data))
    .catch((err) => console.log(err));
})

app.get("/getUser/:id", async (req, res) => {
  User.findOne({ _id: req.params.id })
    .populate("tweets")
    .populate("sharedTweets")
    .then((data) => res.status(200).json(data))
    .catch((err) => console.log(err));
});

app.put("/addLike/:id", async (req, res) => {
  Tweet.findOneAndUpdate(
    { _id: req.params.id },
    { $inc: { likes: 1 } }, (err) => {
      if(err) {
        console.log(err);
      }
    }
  )
});

app.put("/subLike/:id", async (req, res) => {
  Tweet.findOneAndUpdate(
    { _id: req.params.id },
    { $inc: { likes: -1 } }, (err) => {
      if(err) {
        console.log(err);
      }
    }
  )
});

app.post("/likeTweet/:id&:_id", async (req, res) => {
  User.findOneAndUpdate(
    { _id: req.params._id },
    { $push: { likedTweets: req.params.id } }

  ).then((user) => res.status(200).json(user))
  .catch((err) => res.status(400).json(err));
});

app.post("/unlikeTweet/:id&:_id", async (req, res) => {
  User.findOneAndUpdate(
    { _id: req.params._id },
    { $pull: { likedTweets: req.params.id } }

  ).then((user) => res.status(200).json(user))
  .catch((err) => res.status(400).json(err));
});

app.put("/addShare/:id", async (req, res) => {
  Tweet.findOneAndUpdate(
    { _id: req.params.id },
    { $inc: { shares: 1 } }, (err) => {
      if(err) {
        console.log(err);
      }
    }
  )
});

app.put("/subShare/:id", async (req, res) => {
  Tweet.findOneAndUpdate(
    { _id: req.params.id },
    { $inc: { shares: -1 } }, (err) => {
      if(err) {
        console.log(err);
      }
    }
  )
});

app.post("/shareTweet/:id&:_id", async (req, res) => {
  User.findOneAndUpdate(
    { _id: req.params._id },
    { $push: { sharedTweets: req.params.id } }

  ).then((user) => {
    console.log(user);
    res.status(200).json(user);
  })
  .catch((err) => res.status(400).json(err));
});

app.post("/unshareTweet/:id&:_id", async (req, res) => {
  User.findOneAndUpdate(
    { _id: req.params._id },
    { $pull: { sharedTweets: req.params.id } }

  ).then((user) => res.status(200).json(user))
  .catch((err) => res.status(400).json(err));
});

app.put("/follow/:id&:_id", async (req, res) => {
  if(req.params._id === req.params.id)
    return res.status(200).json('Cannot follow yourself');

  try {
    let user = await User.findById(req.params._id);
    if(user.following.includes(req.params.id))
      return res.status(200).json('Already following');

    user.following.push(req.params.id);
    await user.save();


    await User.findOneAndUpdate(
      { _id: req.params.id },
      { $push: { followers: req.params._id } }
    );

    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
})

app.put("/unfollow/:id&:_id", async (req, res) => {
  if(req.params._id === req.params.id)
    return res.status(200).json('Cannot unfollow yourself');

  try {
    let user = await User.findById(req.params._id);
    if(!user.following.includes(req.params.id))
      return res.status(200).json('Not following');

    let index = user.following.indexOf(req.params.id);
    user.following.splice(index);
    await user.save();

    let other = await User.findById(req.params.id);

    index = other.followers.indexOf(req.params._id);
    other.followers.splice(index);
    await other.save();

    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
})

app.listen(5000, () => {
  console.log("backend connnected to port 5000");
});
