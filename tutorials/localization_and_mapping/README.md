# Localization and Mapping with Nav2 and MIRTE

## Why Localization and Mapping Are Important

Before a robot can autonomously navigate, it must know both **where it is** and **what its environment looks like**. Localization and mapping provide this information and are therefore fundamental components of autonomous navigation.

- **Sending navigation goals** to a specific location is only possible if the robot can estimate its current position within the environment. Without localization, the navigation stack cannot compute a valid path to the target.

- **Accurate localization improves safety and reliability.** If the robot does not know its position on the map, it may make incorrect navigation decisions, potentially leading to collisions with obstacles or failure to reach its destination.

- **A map enables global path planning.** By having a representation of the environment, the robot can compute efficient routes from its current position to a desired goal while avoiding known obstacles.

- **Mapping allows the robot to operate in previously unknown environments.** By creating a map of its surroundings, the robot can later localize itself within that map and navigate autonomously.

- **Localization and mapping are core components of autonomous navigation.** Together, they provide the spatial awareness required for path planning, obstacle avoidance, and navigation to desired destinations.

---

## MIRTE Robot

This tutorial uses the MIRTE robot platform that you have been working with throughout the course project.

Before continuing, make sure that the required MIRTE ROS packages have been installed. If you have already completed the installation and created a workspace (for example, `mirte_ws`), navigate to the workspace directory:

```bash
cd ~/mirte_ws
```

If you have not yet installed the MIRTE ROS packages, follow the installation instructions provided in the course repository:

https://github.com/p4mars/spatial-ai-course#install-the-mirte-ros-packages-inside-the-container

Once the installation is complete, return to this tutorial and continue with the next steps.

---

## Simulated Worlds

The simulated environments used in this tutorial are provided in a separate repository. Navigate to the `src` directory of your workspace and clone the repository:

```bash
cd ~/mirte_ws/src
```
And put inside the package 'spatial_ai_simulation'
The rest of the files should be placed in the workspace i.e. where /src is.

Next, return to the workspace root, build the packages, and source the workspace:

```bash
cd ~/mirte_ws
colcon build --symlink-install
source install/setup.bash
```

To verify that the installation was successful, launch one of the simulation environments.

### Launch the Standalone World

This launch file starts the simulated environment without a robot:

```bash
ros2 launch spatial_ai_simulation spatial_ai_simulation.launch.py
```

### Launch the World with a MIRTE Master Robot

This launch file starts the simulated environment and spawns a MIRTE Master robot:

```bash
ros2 launch spatial_ai_simulation spatial_ai_mirte_master.launch.py
```

If Gazebo opens successfully and the environment (with or without the robot) is displayed, the simulation packages have been installed correctly.

## Installing Navigation and SLAM Packages

To perform mapping, localization, and autonomous navigation, several additional ROS 2 packages are required. In this tutorial, we will use **Nav2** for navigation and **SLAM Toolbox** for map generation.

Install the required packages using:

```bash
sudo apt update
sudo apt install ros-$ROS_DISTRO-navigation2 \
                 ros-$ROS_DISTRO-nav2-bringup \
                 ros-$ROS_DISTRO-slam-toolbox
```

After the installation has completed, verify that the packages are available:

```bash
ros2 pkg list | grep nav2
ros2 pkg list | grep slam_toolbox
```

If the commands return package names, the installation was successful.

These packages will be used throughout the remainder of the tutorial:

- **SLAM Toolbox**: Creates a map of an unknown environment while simultaneously estimating the robot's position within that map.
- **Nav2 (Navigation2)**: Enables autonomous navigation by planning paths and controlling the robot to reach user-defined goals.
- **Nav2 Bringup**: Provides launch files and configuration tools required to start the navigation stack.

