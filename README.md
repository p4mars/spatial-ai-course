# Spatial AI
## Docker installation

### Windows Installation

Follow the instructions on the [docker website](https://docs.docker.com/desktop/setup/install/windows-install/) to install Docker Desktop. Please note that the Docker Installer must be ran as admistrator.

If you get the error The docker client must be run elevated to connect. Delete the C:/ProgramData/DockerDesktop and run the installer again as administrator. 

Once installed follow the tutorial on how to run your first image. Once you finish the tutorial, follow the same steps to build the Dockerfile available on Brightspace.

Once that has finished building follow the instructions below to install and build the relevant Mirte Packages inside of the docker.

**Create a project folder on host:**
```bash
mkdir -p ~/mirte_dev/ws/src
cd ~/mirte_dev
```

**Copy the `Dockerfile` and the `docker-compose.yml` in the folder.**
>[!info]
>`notwork_mode: host` is important for ROS 2 discovery and for talking to the physical robot more easily.
>For simulation GUI, the X11 socket mount is the usual Linux approach.

**Build and enter the container**
```bash
cd ~/mirte_dev
docker compose build
docker compose run -rm mirte-dev
```
After the first creation, you can enter the container with:
```bash
docker compose up -d
docker exec -it mirte-dev bash
```

**Install the MIRTE simulation workspace inside the container**
Inside the container:
```bash
cd /workspace/mirte_ws/src
git clone https://github.com/mirte-robot/mirte-gazebo  
vcs import . < mirte-gazebo/sources.repos
```
That mirrors the MIRTE simulation instructions, which say to clone `mirte-gazebo` and then import the repositories listed in `sources.repos`.

*Optional cleanup for simulation mode*, exactly as in the MIRTE docs:
```bash
cd /workspaces/mirte_ws/src/mirte_ros_packages  
rm -rf mirte_bringup/ mirte_telemetrix_cpp/ mirte_teleop/ mirte_test/ mirte_zenoh_setup/
cd /workspaces/mirte_ws
```
MIRTE documents this as an optional speed-up if you do not need those packages and have no changes there.

Install dependencies and build:
```bash
cd /workspaces/mirte_ws
source /opt/ros/humble/setup.bash
rosdep install --from-paths src --ignore-src -r -y
colcon build --symlink-install
source install/setup.bash
```
Those are the same build steps from the MIRTE docs.

