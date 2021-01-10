const fs = require('fs');
const path = require('path');

const {validationResult} = require('express-validator');
const Post = require('../models/post');
const User = require('../models/user');


exports.getPosts = async (req,res,next)=>{
    const currentPage = req.query.page || 1;
    const perPage = 2 ;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().populate('creator').skip((currentPage - 1) * perPage).limit(perPage);
        res.status(200).json({
            message: 'Fetched all post successfully',
            posts: posts,
            totalItems: totalItems
        });
    }catch (err) {
        console.log('error while finding total documents in posts ' +
            'and error while fetching all posts ====>',err);
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }

};

exports.createPost = async (req,res,next)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const error = new Error('Validation failed!,entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file){
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }
    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    const post = new Post({
        title:title,
        content:content,
        imageUrl:imageUrl,
        creator:req.userId
    });
    try {
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        console.log('post successfully created =====>');
        res.status(201).json({
            message: 'Post created successfully!',
            post: post,
            creator: {_id: user._id, name: user.name}
        });
    }catch(err){
        console.log('error while save a post =====>',err);
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPost = async (req,res,next)=>{
  const postId = req.params.postId;
  try {
      const post = await Post.findById(postId);
      if (!post) {
          const error = new Error('Could not find post by id.');
          error.statusCode = 404;
          throw error;
      }
      res.status(200).json({
          message: 'Post fetched',
          post: post
      });
  }catch(err){
      console.log('error while fetching post by ID ====>',err);
      if (!err.statusCode){
          err.statusCode = 500;
      }
      next(err);
  }
};

exports.updatePost = async (req,res,next)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const error = new Error('Validation failed!,entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    }
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file){
        imageUrl = req.file.path;
    }

    if (!imageUrl){
        const error = new Error('No file picked.');
        error.statusCode = 422;
        throw error;
    }
    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Could not find post by id.');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw error;
        }
        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl);
        }

        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;

        const result = await post.save();

        res.status(200).json({message: 'Post updated!', post: result});

    }catch(err){
        console.log('error while updating a post by ID ====>',err);
        if (!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deletePost = async (req,res,next)=>{
  const postId = req.params.postId;
  try {
      const post = await Post.findById(postId);
      if (!post) {
          const error = new Error('Could not find post by id.');
          error.statusCode = 404;
          throw error;
      }
      if (post.creator.toString() !== req.userId.toString()) {
          const error = new Error('Not authorized!');
          error.statusCode = 403;
          throw error;
      }
      clearImage(post.imageUrl);

      await Post.findByIdAndRemove(postId);

      const user = await User.findById(req.userId);
      user.posts.pull(postId);
      await user.save();

      res.status(200).json({message: 'Deleted post.'});

  }catch(err){
      console.log('error while deleting a post by ID ====>',err);
      if (!err.statusCode){
          err.statusCode = 500;
      }
      next(err);
  }
};

const clearImage = filePath=>{
    filePath = path.join(__dirname,'..',filePath);
    fs.unlink(filePath,err =>console.log('error while deleting a file from file system ======>',err));
};