import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export interface Robot {
  name: string;
  ip: string;
}

export const RobotStorage = {
  // Get all robots
  getRobots: (): Robot[] => {
    try {
      const robotsJson = storage.getString('robots');
      return robotsJson ? JSON.parse(robotsJson) : [];
    } catch (error) {
      console.error('Error loading robots:', error);
      return [];
    }
  },

  // Save all robots
  saveRobots: (robots: Robot[]): void => {
    try {
      storage.set('robots', JSON.stringify(robots));
    } catch (error) {
      console.error('Error saving robots:', error);
    }
  },

  // Add a new robot
  addRobot: (robot: Robot): Robot => {
    const robots = RobotStorage.getRobots();
    
    // Check if robot with same name already exists
    const existingRobot = robots.find(r => r.name === robot.name);
    if (existingRobot) {
      throw new Error(`Robot with name "${robot.name}" already exists`);
    }
    
    robots.push(robot);
    RobotStorage.saveRobots(robots);
    return robot;
  },

  // Update a robot by name
  updateRobot: (name: string, updates: Partial<Robot>): void => {
    const robots = RobotStorage.getRobots();
    const index = robots.findIndex(robot => robot.name === name);
    if (index !== -1) {
      robots[index] = { ...robots[index], ...updates };
      RobotStorage.saveRobots(robots);
    }
  },

  // Delete a robot by name
  deleteRobot: (name: string): void => {
    const robots = RobotStorage.getRobots();
    const filteredRobots = robots.filter(robot => robot.name !== name);
    RobotStorage.saveRobots(filteredRobots);
  },

  // Get a single robot by name
  getRobot: (name: string): Robot | undefined => {
    const robots = RobotStorage.getRobots();
    return robots.find(robot => robot.name === name);
  },
}; 