const User = require('../models/user');
const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



exports.signup = async (req,res,next)=>{
  const errors  = validationResult(req);
  if (!errors.isEmpty()){
      const error = new Error('validation failed.');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
          email: email,
          name: name,
          password: hashedPassword
      });
      const result = await user.save();
      res.status(201).json({
          message: 'User Created!',
          userId: result._id,
      });
  }catch(err){
      console.log('error while signing up a user =====>',err);
      if (!err.statusCode){
          err.statusCode = 500;
      }
      next(err);
  }
};

exports.login = async (req,res,next)=>{
  const email = req.body.email;
  const password = req.body.password;
  try {
      const user = await User.findOne({email: email});
      if (!user) {
          const error = new Error('A user with this email count not be found!');
          error.statusCode = 401;
          throw error;
      }
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
          const error = new Error('Wrong password!');
          error.statusCode = 401;
          throw error;
      }

      const token = jwt.sign({
          email: user.email,
          userId: user._id.toString()
      }, 'secret', {expiresIn: '1h'});

      res.status(200).json({
          message: 'user check done',
          token: token,
          userId: user._id.toString()
      });
  }catch(err){
      console.log('error while signing in a user =====>',err);
      if (!err.statusCode){
          err.statusCode = 500;
      }
      next(err);
  }
};

exports.getUserStatus = async (req,res,next)=>{
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error('No such user exist');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            status: user.status
        });
    }catch(err){
        console.log('error while getting user status ===>', err);
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateUserStatus = async (req,res,next)=>{
  const newStatus = req.body.status;
  try {
      const user = await User.findById(req.userId);
      if (!user) {
          const error = new Error('No such user exist');
          error.statusCode = 404;
          throw error;
      }
      user.status = newStatus;
      await user.save();
      res.status(200).json({message: 'User status updated.'});
  }catch(err){
      console.log('error while updating a user status ===>', err);
      if (!err.statusCode) {
          err.statusCode = 500;
      }
      next(err);
  }
};