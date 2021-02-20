
import userRouter from './user';
import authRouter from './auth';

const routes = (router) => {
  router.use('/user', userRouter(router))
  router.use('/auth', authRouter(router))

  return router
}

export default routes;