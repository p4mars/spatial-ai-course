# spatial_ai_navigation

This `README.md` contains basic commands for this tutorial. Tutorial is in `Tutorial.md`
Navigation and mapping for the Spatial AI MIRTE Gazebo simulation.

## Meaning

- Cartographer: creates the map while you drive the robot around.
- Navigation/Nav2: uses a saved map so the robot can plan and move to goals.
- MIRTE uses mecanum wheels, so Nav2 is configured as holonomic.
- Nav2 uses a padded rectangular MIRTE footprint for obstacle clearance.

## Pipeline

```bash
cd /home/spatial-ai/test_ws
colcon build --packages-select spatial_ai_simulation spatial_ai_navigation
source install/setup.bash
```

1. Create the map:

```bash
ros2 launch spatial_ai_navigation spatial_ai_mapping.launch.py
```

This starts Gazebo, Cartographer, and RViz. To run without RViz:

```bash
ros2 launch spatial_ai_navigation spatial_ai_mapping.launch.py rviz:=false
```

2. Move MIRTE around while Cartographer builds the map:

```bash
ros2 run teleop_twist_keyboard teleop_twist_keyboard --ros-args -r /cmd_vel:=/mirte_base_controller/cmd_vel_unstamped
```

3. Save the map:

```bash
ros2 run nav2_map_server map_saver_cli -f ~/spatial_ai_map
```

4. Close the mapping launch.

5. Start navigation with the saved map:

```bash
ros2 launch spatial_ai_navigation spatial_ai_navigation.launch.py map:=$HOME/spatial_ai_map.yaml
```

This starts Gazebo, Nav2, and RViz. In RViz, use `2D Pose Estimate` for the start pose and `Nav2 Goal` for the goal pose.
