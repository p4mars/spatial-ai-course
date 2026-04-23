FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Basic dependencies

RUN apt-get update && apt-get install -y \
locales \
curl  \
gnupg2 \
lsb-release \
sudo \
git \
wget \
&& rm -rf /var/lib/apt/lists/*

# Locale setup

RUN locale-gen en_US en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Add ROS 2 apt repository

RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.asc | apt-key add -
RUN echo "deb http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/ros2.list

# Install ROS 2 + tools

RUN apt-get update && apt-get install -y \
ros-humble-desktop \
python3-colcon-common-extensions \
python3-rosdep \
python3-vcstool \
&& rm -rf /var/lib/apt/lists/*

# Initialize rosdep

RUN rosdep init || true
RUN rosdep update

# Install Gazebo (via ROS packages)

RUN apt-get update && apt-get install -y \
ros-humble-gazebo-ros-pkgs \
&& rm -rf /var/lib/apt/lists/*

# Install RViz2 (already in desktop, but explicit for clarity)

RUN apt-get update && apt-get install -y \
ros-humble-rviz2 \
&& rm -rf /var/lib/apt/lists/*



# Setup ROS environment in bash

RUN echo "source /opt/ros/humble/setup.bash" >> /root/.bash

# Default command

CMD ["bash"]
