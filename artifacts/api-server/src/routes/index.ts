import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import workoutsRouter from "./workouts";
import exercisesRouter from "./exercises";
import nutritionRouter from "./nutrition";
import progressRouter from "./progress";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import aiWorkoutRouter from "./ai-workout";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(workoutsRouter);
router.use(exercisesRouter);
router.use(nutritionRouter);
router.use(progressRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(aiWorkoutRouter);
router.use(subscriptionsRouter);

export default router;
