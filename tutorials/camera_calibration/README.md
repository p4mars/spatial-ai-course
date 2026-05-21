# Camera Calibration with ROS 2

This tutorial recaps the fundamentals of camera calibration introduced in the lecture and guide you through the calibration process using the build-in cmaera on your laptop. Along the way, you will also learn how to create a simple ROS 2 Python package that publishes webcam images as ROS topics, which is a common workflow in robotics.

In this tutorial, you will:

1. Set up the required ROS 2 packages.
2. Create a ROS 2 Python package.
3. Write a webcam publisher using OpenCV.
4. Publish the laptop camera image as a ROS 2 topic.
5. Run the ROS 2 calibration toolbox.
6. Save the calibration result.

<details>

<summary>Bonus Actrivities</summary>

Once your camera is calibrated, you can further explore two interactive notebooks included in this tutorial:

[Calibrated Line Detection](line_detection.ipynb): Detect straight lines more reliably using an undistorted camera image.

[ArUco Marker Pose Estimation](aruco_marker_pose_estimation.ipynb): Detect an ArUco marker and estimate its 3D pose relative to the camera.

These examples demonstrate how camera calibration improves geometric perception and supports robotics tasks such as localization, navigation, and spatial understanding.
</details>

## Table of Contents

1. [Recap](#1-recap)
2. [ROS 2 Setup](#2-ros-2-setup)
3. [OpenCV Webcam Publisher](#3-opencv-webcam-publisher)
4. [Camera Calibration](#4-camera-calibration)
5. [Troubleshooting](#5-troubleshooting)
6. [Checklist](#6-checklist)


# 1. Recap

## 1.1  Why do we calibrate a camera?

A camera is not just a device that takes pictures. For a robot, a camera is a sensor that helps the robot understand the 3D world.

For example, a robot may use a camera to answer questions such as:

- Where is an object?
- How far away is the wall?
- Is the robot moving straight?
- Can the robot build a map of the room?
- Can the robot navigate to a target location?
- Can the robot pick up an object?

However, a raw camera image is not automatically geometrically correct. The image is affected by the camera lens, sensor, and manufacturing details.

Camera calibration estimates these properties so that computer vision algorithms can use the image correctly.


## 1.2 What is camera calibration? 

Camera calibration estimates two main types of parameters:

### Intrinsic parameters

These describe the internal geometry of the camera, for example:

- focal length in pixels,
- optical center,
- image width and height.

The intrinsic matrix is usually written as:

$$
\mathbf{K} = \begin{bmatrix} f_x & 0 & c_x \\
      0  & f_y & c_y \\
      0  &  0  & 1 
      \end{bmatrix}
$$

Where:

- $f_x$, $f_y$ are focal lengths in pixel units,
- $c_x$, $c_y$ describe the optical center of the image.

### Distortion parameters

Real camera lenses may bend straight lines, especially near the image borders. This effect is called lens distortion. In distorted images, you can commonly observe that straight lines look curved and objects near the edge of the image look stretched, as shown in the figure below. Consequently, geometric measurements from pixels become inaccurate. Calibration estimates distortion coefficients so that the image can be corrected.

![Barrel distortion and pincushion distortion](https://cdn.learnopencv.com/wp-content/uploads/2019/10/04095412/radial-distortions-768x264.png)


## 1.3 Why does this matter for Spatial AI and robotics?

In Spatial AI, the robot tries to reason about space using sensor data. For example, the MIRTE robot may need to:

- map the surroundings,
- estimate its position,
- detect objects,
- navigate through obstacles,
- manipulate objects.

All of these tasks become less reliable if the camera model is wrong. A calibrated camera allows ROS 2 nodes to interpret image pixels as geometric rays in 3D space.

In ROS 2, this calibration information is usually published as a `CameraInfo` message together with the image stream.

---

# 2. ROS 2 Setup

## 2.1. Install dependencies

> [!NOTE]
> This tutorial assumes that you already have ROS 2 installed either using docker/pixi/virtual machine or on a natural Ubuntu system. If you are using Docker, pixi, WSL, macOS, or Windows, the ROS 2 commands may still work, but webcam access may be different. The easiest setup is native Ubuntu.

> [!IMPORTANT]
> If you are using `pixi`, use the following commands instead.
> In your pixi workspace, run:
> ```bash
>    pixi add ros-humble-camera-calibration ros-humble-cv-bridge ros-humble-rqt-image-view
> ```
> After that enter the pixi shell and continue with 2.2.

Activate your ros development environment and source the ROS setup: 
```bash
source /opt/ros/humble/setup.bash
```

Install the packages needed for this tutorial:

```bash
sudo apt update
sudo apt install ros-humble-camera-calibration #Provides the ROS 2 camera calibration tool
sudo apt install ros-humble-cv-bridge #Converts between OpenCV images and ROS image messages
sudo apt install ros-humble-rqt-image-view #Allows us to view ROS image topics
sudo apt install python3-opencv # Allows Python to access the webcam using OpenCV
sudo apt install python3-colcon-common-extensions
```

You can test whether OpenCV is installed by running:
```bash
python3 -c "import cv2; print(cv2.__version__)"
```
If you see a version number, OpenCV is installed correctly.


## 2.2 Create a workspace

A ROS 2 workspace is a folder where you develop ROS 2 packages.

You can reuse the existing workspace `mirte-ws`:
```bash
cd <your path>/mirte_ws/src
```
or create a new workspace:

```bash
mkdir -p ~/camera_calib_ws/src
cd ~/camera_calib_ws/src
```

# 3. OpenCV Webcam Publisher

A ROS 2 image publisher is a node that sends images to a ROS 2 topic. We've provided the well-documented python script called [`webcam_publisher.py`](webcam_publisher.py) in the tutorial folder.

In this script:

- OpenCV reads images from the laptop webcam.
- `cv_bridge` converts the OpenCV image into a ROS 2 image message.
- ROS 2 publishes the image to `/laptop_camera/image_raw`.

The calibration tool will subscribe to this image topic.


## 3.1 Create a ROS 2 Python package

Go to the `src` folder:

```bash
cd <your workspace>/src
```

Create a package:

```bash
ros2 pkg create camera_publisher \
  --build-type ament_python \
  --dependencies rclpy sensor_msgs cv_bridge
```

This creates a package called `camera_publisher`. After that, your folder structure should look like:

```text
camera_calib_ws/
└── src/
    └── laptop_camera_publisher/
        ├── package.xml
        ├── setup.py
        ├── setup.cfg
        ├── resource/
        ├── test/
        └── camera_publisher/
```

---

## 3.2 Create the Python file

Go into the Python module folder:

```bash
cd <your workspace>/src/camera_publisher/camera_publisher
```

Create a new file:

```bash
touch webcam_publisher.py
```

Open the file with your preferred editor and copy the content from [`webcam_publisher.py`](webcam_publisher.py) to the created file.

<details>
<summary> Understand the code </summary>

## 3.3 Understand the code 
Important parts of the code:

### Open the camera

```python
self.cap = cv2.VideoCapture(self.camera_id)
```

This asks OpenCV to open a camera.

Usually:

```text
camera_id = 0
```

means the default laptop webcam.

---

### Read an image

```python
ret, frame = self.cap.read()
```

This reads one image frame from the camera.

- `ret` tells us whether reading was successful.
- `frame` is the actual image.

---

### Convert OpenCV image to ROS 2 image

```python
image_msg = self.bridge.cv2_to_imgmsg(frame, encoding='bgr8')
```

OpenCV images are not automatically ROS messages.

`cv_bridge` performs the conversion.

---

### Publish the image

```python
self.image_pub.publish(image_msg)
```

This publishes the camera image to:

```text
/laptop_camera/image_raw
```

---

### Publish camera information

```python
self.camera_info_pub.publish(camera_info_msg)
```

This publishes camera metadata to:

```text
/laptop_camera/camera_info
```

Before calibration, this is mostly empty.

After calibration, this topic should contain the camera matrix and distortion coefficients.

</details>

## 3.4 Register the executable

Go back to the package folder:

```bash
cd <your workspace>/src/camera_publisher
```

Open `setup.py` and find this part:

```python
entry_points={
    'console_scripts': [
    ],
},
```

Replace it with:

```python
entry_points={
    'console_scripts': [
        'webcam_publisher = camera_publisher.webcam_publisher:main',
    ],
},
```

Save the file.

## 3.5 Build the workspace

```bash
cd <your workspace>
colcon build --symlink-install --packages-select camera_publisher
```

Source the workspace:

```bash
source install/setup.bash
```

>[!IMPORTANT]
> You need to source the workspace in every new terminal `source <your workspace>/install/setup.bash`

## 3.6 Run the webcam publisher

Run:

```bash
ros2 run camera_publisher webcam_publisher
```

Expected output:

```text
[INFO] [webcam_publisher]: Laptop webcam publisher started.
[INFO] [webcam_publisher]: Publishing: /laptop_camera/image_raw
[INFO] [webcam_publisher]: Publishing: /laptop_camera/camera_info
```

This node is now running. Keep this terminal open and open a second terminal to check the topics:
```bash
ros2 topic list
```

You should see:

```text
/laptop_camera/image_raw
/laptop_camera/camera_info
```

Check the image publishing frequency:

```bash
ros2 topic hz /laptop_camera/image_raw
```

You should see a frequency close to the selected FPS.

For example:

```text
average rate: 30.0
```

## 3.10 View the camera image

Run:

```bash
ros2 run rqt_image_view rqt_image_view
```

Select:

```text
/laptop_camera/image_raw
```

You should see the laptop camera image.

If the image appears, the webcam publisher is working. If the camera does not open, try another camera ID:

```bash
ros2 run laptop_camera_publisher webcam_publisher --ros-args \
  -p camera_id:=1
```

or:

```bash
ros2 run laptop_camera_publisher webcam_publisher --ros-args \
  -p camera_id:=2
```

On Linux, you can also check available video devices:

```bash
ls /dev/video*
```

<details>
<summary>
You can also change the published image size and FPS
</summary>

Example:

```bash
ros2 run laptop_camera_publisher webcam_publisher --ros-args \
  -p camera_id:=0 \
  -p image_width:=1280 \
  -p image_height:=720 \
  -p fps:=15.0
```

For calibration, a stable image is more important than a very high resolution.

A good default is:

```text
640 x 480 at 30 FPS
```

or:

```text
1280 x 720 at 15 FPS
```
</details>


# 4. Camera Calibration

Using the ROS camera calibration toolbox to calibrate your camera, you need to

- running webcam publisher,
- printed checkerboard,
- known checkerboard square size,
- ROS 2 camera calibration tool.

You can use the provided checkerboard printed on A4 paper. It has 8x6 inner corners and the square size is 0.024 m. This calibrator is only for tutorial purpose. In pratice, you should attach it to a flat board rather than holding a loose, bent paper in your hand.

Firxt, you need to start the webcam publisher and keep this terminal running.
```
ros2 run camera_publisher webcam_publisher
```


In the second terminal, start the calibration tool

```bash
source <your workspace>/install/setup.bash
ros2 run camera_calibration cameracalibrator \
  --size 8x6 \
  --square 0.024 \
  image:=/laptop_camera/image_raw \
  camera:=/laptop_camera
```

Explanation:

| Argument | Meaning |
|---|---|
| `--size 8x6` | Checkerboard has 8 by 6 inner corners |
| `--square 0.024` | Each square is 0.024 m wide |
| `image:=/laptop_camera/image_raw` | Input image topic |
| `camera:=/laptop_camera` | Camera namespace |

Then, we can collect good calibration samples by moving the checkerboard slowly in front of the camera. Do not only keep the checkerboard in the center. Try to cover many parts of the image:

- center,
- top,
- bottom,
- left,
- right,
- corners.

Use different poses:

- close to camera,
- far from camera,
- tilted left/right,
- tilted up/down,
- rotated.

Good calibration needs variety.

When enough samples are collected, the calibration button becomes available. Click `CALIBRATE`. The results should show up in the terminal. Then, click `SAVE`. The result is usually saved to `/tmp` as a compressed file named `calibrationdata.tar.gz`

<details>
<summary>
To inspect the calibration file
</summary>

Open the file:

```bash
gedit ~/camera_calib_ws/calibration/laptop_camera.yaml
```

You should see entries similar to:

```yaml
image_width: 640
image_height: 480
camera_name: narrow_stereo
camera_matrix:
  rows: 3
  cols: 3
  data: [...]
distortion_model: plumb_bob
distortion_coefficients:
  rows: 1
  cols: 5
  data: [...]
```

Important fields:

| Field | Meaning |
|---|---|
| `image_width`, `image_height` | Image size used during calibration |
| `camera_matrix` | Intrinsic matrix |
| `distortion_coefficients` | Lens distortion parameters |
| `distortion_model` | Distortion model used by ROS |
</details>

A successful calibration means that ROS now has a camera model. This camera model describes how this specific camera forms images. The calibration result can be used for:

- image undistortion,
- marker pose estimation,
- visual odometry,
- mapping,
- object localization,
- robot navigation.

Once your camera is calibrated, you can further explore two interactive notebooks included in this tutorial.

# References

- ROS 2 camera calibration tutorial: https://docs.ros.org/en/rolling/p/camera_calibration/doc/tutorial_mono.html
- ROS 2 package creation tutorial: https://docs.ros.org/en/foxy/Tutorials/Beginner-Client-Libraries/Creating-Your-First-ROS2-Package.html
- cv_bridge Python documentation: https://docs.ros.org/en/kinetic/api/cv_bridge/html/python/
