# Spatial AI Navigation Tutorial

This tutorial introduces ROS 2 navigation with Nav2 using the Spatial AI MIRTE
Gazebo simulation. 


## Learning Goals

By the end of this tutorial, you should be able to:

- Launch MIRTE, Nav2, and RViz with a saved map.
- Set the robot's initial pose in RViz.
- Send a navigation goal from RViz.
- Send the same kind of goal from the command line.
- Explain the difference between the global costmap and local costmap.
- Identify the main Nav2 components used in this package.
- Modify one Nav2 parameter and manipulate robot navigation behaviour by setting the parameters.

## Prerequisites

You need:

- Linux, or a Linux virtual machine on macOS or Windows.
- ROS 2 and the mirte-gazebo and nav2 dependencies installed.
- Gazebo and RViz2 working with a graphical display.

The Spatial AI course repository is available at:

```text
https://github.com/p4mars/spatial-ai-course
```

## 1. Install Nav2 And Dependencies

On an amd64 Linux machine, install the required ROS 2 Humble packages with apt:

```bash
sudo apt update
sudo apt install -y \
  ros-humble-gazebo-ros \
  ros-humble-gazebo-ros-pkgs \
  ros-humble-gazebo-ros2-control \
  ros-humble-cartographer-ros \
  ros-humble-nav2-bringup \
  ros-humble-controller-manager \
  ros-humble-hardware-interface \
  ros-humble-ros2-controllers \
  ros-humble-ros2-controllers-test-nodes \
  ros-humble-joint-state-broadcaster \
  ros-humble-diff-drive-controller \
  ros-humble-ros2controlcli \
  ros-humble-twist-mux \
  ros-humble-twist-stamper \
  ros-humble-xacro
```

On a Mac using a Linux virtual machine, the machine may use an arm64 chip. Some
ROS packages may not be available from apt for arm64. If the apt install command above 
does not work, clone the Nav2 source code into your workspace and compile it
from source.

```bash
cd ~/YOUR_WS/src
git clone -b humble https://github.com/ros-navigation/navigation2.git
cd ~/YOUR_WS
rosdep update
rosdep install --from-paths src --ignore-src -r -y
colcon build --symlink-install
source install/setup.bash
```


## 2. Build The Workspace

Copy this folder `navigation` into your `~/YOUR_WS/src`. After coping, it should look like `~/YOUR_WS/src/navigation`. Open a terminal and build the simulation and navigation packages:

```bash
cd ~/YOUR_WS
colcon build --packages-select spatial_ai_simulation spatial_ai_navigation
source install/setup.bash
```

If there's build error.
1. error `duplicate package spatial_ai_simulation`. Then delete one of the spatial_ai_simulation
2. error `build fail`. Then remove the build and install folder. And then `colcon build` again.

You must source the workspace in every new terminal that will run ROS commands:

```bash
source ~/YOUR_WS/install/setup.bash
```

## 3. Launch Nav2 With A Saved Map

Start Gazebo, Nav2, and RViz by using commands below:

```bash
ros2 launch spatial_ai_navigation spatial_ai_navigation.launch.py map:=src/navigation/spatial_ai_navigation/map/spatial_ai_map.yaml
 # replace the path with the map you saved. Or you can use the map in spatial_ai_navigation/map/spatial_ai_map.yaml
```

After launch, you should see:
![alt text](spatial_ai_navigation/assets/figures/image.png)

- Gazebo with the MIRTE robot.
- RViz with the saved map.
- Nav2 tools such as `2D Pose Estimate` and `Nav2 Goal`.
- Global and local costmap displays.

If the map path is different, replace
`src/navigation/spatial_ai_navigation/map/spatial_ai_map.yaml` with the full path to your
own map YAML file.

## 4. Localize The Robot

Nav2 needs to know where the robot is on the saved map.

In RViz:

1. Click `2D Pose Estimate`(Top of RVIZ2).
2. Click on the map where the robot starts.
3. Drag in the direction the robot is facing.

The robot pose estimate is handled by AMCL. In this package, AMCL uses the
`/scan` laser topic and the saved map to estimate the robot pose.

How to know the `/amcl_pose` of robot:

```bash
ros2 topic echo /amcl_pose
```

If `/amcl_pose` is publishing, AMCL is producing localization estimates.

## 5. Send A Navigation Goal In RViz

In RViz:

1. Click `Nav2 Goal`.
2. Click the target position on the map.
3. Drag to set the final direction.

The robot should plan a path and start moving toward the goal.

Watch these displays in RViz:
![alt text](spatial_ai_navigation/assets/figures/image2.png)
- The planned global path.
- The global costmap.
- The local costmap.
- The robot footprint.

## 6. Send A Navigation Goal From The Command Line

RViz sends a Nav2 action goal to `/navigate_to_pose`. You can send the same type
of goal from the terminal. 

```bash
ros2 action send_goal /navigate_to_pose nav2_msgs/action/NavigateToPose "{
  pose: {
    header: {frame_id: 'map'},
    pose: {
      position: {x: -1.385, y: 0.575, z: 0.0},
      orientation: {x: 0.0, y: 0.0, z: 0.0, w: 1.0}
    }
  },
  behavior_tree: ''
}" --feedback
```

The goal position is expressed in the `map` frame. Change `x` and `y` to choose
a different goal location.

Useful commands to check action:

```bash
ros2 action list
ros2 action info /navigate_to_pose
```

If you want to navigate the robot in your code using `/navigate_to_pose` action. You could use code like:

```python
  import rclpy
  from rclpy.node import Node
  from rclpy.action import ActionClient
  from nav2_msgs.action import NavigateToPose
  from geometry_msgs.msg import PoseStamped


  class NavToPoseClient(Node):
      def __init__(self):
          super().__init__('nav_to_pose_client')
          self.client = ActionClient(self, NavigateToPose, '/navigate_to_pose')

      def send_goal(self):
          self.client.wait_for_server()

          goal_msg = NavigateToPose.Goal()
          goal_msg.pose.header.frame_id = 'map'
          goal_msg.pose.header.stamp = self.get_clock().now().to_msg()

          goal_msg.pose.pose.position.x = -1.385
          goal_msg.pose.pose.position.y = 0.575
          goal_msg.pose.pose.position.z = 0.0

          goal_msg.pose.pose.orientation.x = 0.0
          goal_msg.pose.pose.orientation.y = 0.0
          goal_msg.pose.pose.orientation.z = 0.0
          goal_msg.pose.pose.orientation.w = 1.0

          self.client.send_goal_async(goal_msg)
```

## 7. What Happens Inside Nav2

For this tutorial, focus on this simplified Nav2 pipeline:

```text
Saved map + laser scan
        |
      AMCL
        |
 robot pose in map
        |
 Behavior Tree Navigator
        |
 planner server -> controller server -> cmd_vel
```

Important components (You will see components below in navigation launch terminal output):

- `map_server`: loads the saved occupancy grid map.
- `amcl`: estimates the robot pose on the map.
- `bt_navigator`: coordinates the navigation task using a behavior tree.
- `planner_server`: computes a global path from the robot to the goal.
- `controller_server`: computes velocity commands to follow the path.
- `behavior_server`: provides recovery behaviors such as spin, backup, and wait.
- `costmaps`: represent obstacles and safety margins for planning and control.


## 8. Global Costmap And Local Costmap

Nav2 uses costmaps to decide where the robot can safely move.

![alt text](spatial_ai_navigation/assets/figures/image3.png)

The local costmap lies near the robot. It has a brighter display in rviz2. The global costmap lies across the whole map.

The global costmap:

- Uses the `map` frame.
- Covers the saved map.
- Uses the static map layer.
- Also uses laser scan obstacle data in this package.
- Helps the planner server compute a global path.

The local costmap:

- Uses the `odom` frame.
- Is a rolling window around the robot.
- Uses live laser scan obstacle data.
- Helps the controller server avoid nearby obstacles while following the path.

It is normal for the local costmap to look different from the global costmap.
The local costmap is centered around the robot and moves with it.

## 9. Important Parameters

The main Nav2 parameter file is:

```bash
~/YOUR_WS/src/navigation/spatial_ai_navigation/config/nav2_params.yaml
```

Parameters worth understanding:

### Robot Shape

```yaml
footprint: "[[0.21, 0.17], [0.21, -0.17], [-0.21, -0.17], [-0.21, 0.17]]"
footprint_padding: 0.01
```

The footprint describes the robot size. Nav2 uses it to avoid collisions.

### Inflation Radius

```yaml
inflation_radius: 0.25
cost_scaling_factor: 5.0
```

Inflation adds a safety margin around obstacles. A larger inflation radius makes
the robot stay farther from obstacles, but narrow passages may become harder to
use.

### Velocity Limits

```yaml
max_vel_x: 1.0
max_vel_y: 1.0
max_vel_theta: 1.0
max_speed_xy: 0.18
```

These limit forward, sideways, combined translational, and rotational speed.
Because MIRTE is holonomic, it can use both `x` and `y` velocity.

### Controller Critics

```yaml
critics: [RotateToGoal, Oscillation, BaseObstacle, PreferForward, GoalAlign, PathAlign, PathDist, GoalDist]
```

In this tutorial, we use DWB controller server. DWB samples possible velocity commands and scores them with critics. The critic weights affect how strongly the robot tries to follow the path, face the goal,
avoid obstacles, or reduce oscillation. [More detail is in Nav2 Official Documentation](https://docs.nav2.org/configuration/packages/configuring-dwb-controller.html)

## 10. Parameter Experiments

You can test different Nav2 behavior by changing values in the parameter file,
or by launching Nav2 with a different parameter file.

The launch argument for selecting a parameter file is `params_file`.

### Inflation Radius Experiment

Try changing the local and global costmap inflation radius.

Open:

```bash
~/YOUR_WS/src/navigation/spatial_ai_navigation/config/nav2_params.yaml
```

Find both `inflation_radius` entries and change:

```yaml
inflation_radius: 0.25
```

to:

```yaml
inflation_radius: 0.45
```

Then rebuild and relaunch:

```bash
cd ~/YOUR_WS
colcon build --packages-select spatial_ai_navigation
source install/setup.bash
ros2 launch spatial_ai_navigation spatial_ai_navigation.launch.py map:=src/spatial_ai_navigation/map/spatial_ai_map.yaml
```

Observe:

- The inflated obstacle area in RViz.
- Whether paths keep more distance from obstacles.
- Whether narrow spaces become harder to navigate.

After the experiment, change the value back if you want the original behavior.

### Speed Experiment

This package includes a faster Nav2 parameter file:

```bash
~/YOUR_WS/src/spatial_ai_navigation/config/nav2_fast_speed_params.yaml
```

The fast configuration keeps the same planner and costmaps, but uses a
forward-focused controller profile:

```yaml
min_vel_x: -0.03
max_vel_x: 1.5
max_vel_y: 1.2
max_vel_theta: 1.5
max_speed_xy: 0.6
acc_lim_x: 1.0
acc_lim_y: 0.7
```

Launch Nav2 with the fast parameter file:

```bash
cd ~/YOUR_WS
colcon build --packages-select spatial_ai_navigation
source install/setup.bash
ros2 launch spatial_ai_navigation spatial_ai_navigation.launch.py \
  map:=src/navigation/spatial_ai_navigation/map/spatial_ai_map.yaml \
  params_file:=src/navigation/spatial_ai_navigation/config/nav2_fast_speed_params.yaml
```

Observe:

- Whether the robot reaches the goal faster.
- Is it more likely to collide with obstacles when speed is faster.

### Failed PreferForward Experiment

This package also includes a failed parameter case:

```bash
~/YOUR_WS/src/navigation/spatial_ai_navigation/config/nav2_failed_preferforward_params.yaml
```

This file sets `PreferForward.scale` very large, so the robot will not be able to go backward:

```yaml
PreferForward.scale: 100.0
```

Launch Nav2 with the failed parameter file:

```bash
cd ~/YOUR_WS
colcon build --packages-select spatial_ai_navigation
source install/setup.bash
ros2 launch spatial_ai_navigation spatial_ai_navigation.launch.py \
  map:=src/navigation/spatial_ai_navigation/map/spatial_ai_map.yaml \
  params_file:=src/navigation/spatial_ai_navigation/config/nav2_failed_preferforward_params.yaml
```

This is a failed parameter case. The robot may try too hard to avoid backward
or turning-heavy trajectories, so it can keep moving forward, and can not move backward and turn.

Observe:

- Whether the robot keeps going forward even when the path turns.
- Whether it fails to align with the global path.


## Summary

Nav2 uses a saved map, localization, costmaps, a global planner, and a local
controller to move the robot to a goal. In this package, MIRTE is configured as
a holonomic robot, the global planner computes a path on the map, and the DWB
controller generates velocity commands while checking local obstacles.

Nav2 parameters control practical robot behavior: speed limits, acceleration,
costmap inflation, and controller critic weights can make the robot smoother,
faster, safer, or unstable if tuned poorly. When deploying Nav2 on a real MIRTE
robot, tune these parameters carefully for the robot and environment.
