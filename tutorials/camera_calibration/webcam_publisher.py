#!/usr/bin/env python3

"""
ROS 2 Webcam Publisher

This node reads images from a laptop webcam using OpenCV and publishes them
as ROS 2 messages.

Published topics:
    /laptop_camera/image_raw
        The raw image from the webcam.

    /laptop_camera/camera_info
        Metadata about the camera. Before calibration, this message only
        contains image size and header information. After calibration, it can
        be extended to include intrinsic parameters.

Why do we need this node?
    The ROS 2 camera calibration toolbox expects a ROS Image topic.
    A normal laptop webcam does not automatically publish ROS topics.
    Therefore, we write this bridge:
        laptop webcam -> OpenCV image -> ROS Image message
"""

import cv2

import rclpy
from rclpy.node import Node

from sensor_msgs.msg import Image
from sensor_msgs.msg import CameraInfo

from cv_bridge import CvBridge


class WebcamPublisher(Node):
    """
    A ROS 2 node that publishes images from a webcam.

    In ROS 2, a "node" is one running program that communicates with other
    programs using topics, services, or actions.

    This node does two things repeatedly:
        1. Read one frame from the webcam.
        2. Publish that frame as a ROS Image message.
    """

    def __init__(self):
        """
        Constructor of the node.

        This function is called once when the node starts.
        We use it to:
            - define parameters,
            - open the webcam,
            - create ROS publishers,
            - create a timer for repeated publishing.
        """

        # Initialize the parent Node class.
        # The name of this ROS node will be "webcam_publisher".
        super().__init__('webcam_publisher')

        # ------------------------------------------------------------
        # 1. Declare ROS parameters
        # ------------------------------------------------------------
        # Parameters allow users to configure the node from the command line
        # without editing the Python code.
        #
        # Example:
        # ros2 run laptop_camera_publisher webcam_publisher --ros-args -p camera_id:=1

        self.declare_parameter('camera_id', 0)
        self.declare_parameter('frame_id', 'laptop_camera_frame')
        self.declare_parameter('fps', 30.0)
        self.declare_parameter('image_width', 640)
        self.declare_parameter('image_height', 480)

        # Read the parameter values and store them in Python variables.
        self.camera_id = self.get_parameter('camera_id').value
        self.frame_id = self.get_parameter('frame_id').value
        self.fps = self.get_parameter('fps').value
        self.image_width = self.get_parameter('image_width').value
        self.image_height = self.get_parameter('image_height').value

        # ------------------------------------------------------------
        # 2. Open the webcam using OpenCV
        # ------------------------------------------------------------
        # cv2.VideoCapture(0) usually means:
        #     "open the default webcam"
        #
        # If the laptop has multiple cameras, camera_id may need to be 1 or 2.
        self.cap = cv2.VideoCapture(self.camera_id)

        # Check whether the camera was opened successfully.
        if not self.cap.isOpened():
            self.get_logger().error(
                f'Cannot open camera with id {self.camera_id}. '
                'Try camera_id:=1 or camera_id:=2.'
            )
            raise RuntimeError(f'Cannot open camera with id {self.camera_id}')

        # Request a specific image resolution and frame rate.
        # Note:
        # The camera may not always support the requested values exactly.
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.image_width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.image_height)
        self.cap.set(cv2.CAP_PROP_FPS, self.fps)

        # ------------------------------------------------------------
        # 3. Create ROS publishers
        # ------------------------------------------------------------
        # A publisher sends messages to a topic.
        #
        # Image topic:
        #     This publishes the actual camera image.
        #
        # CameraInfo topic:
        #     This publishes camera metadata such as image size and,
        #     after calibration, intrinsic parameters.

        self.image_pub = self.create_publisher(
            Image,
            '/laptop_camera/image_raw',
            10
        )

        self.camera_info_pub = self.create_publisher(
            CameraInfo,
            '/laptop_camera/camera_info',
            10
        )

        # ------------------------------------------------------------
        # 4. Create a CvBridge object
        # ------------------------------------------------------------
        # OpenCV stores images as NumPy arrays.
        # ROS uses sensor_msgs/Image messages.
        #
        # CvBridge converts:
        #     OpenCV image -> ROS Image message
        self.bridge = CvBridge()

        # ------------------------------------------------------------
        # 5. Create a timer
        # ------------------------------------------------------------
        # The timer calls self.publish_frame() repeatedly.
        #
        # If fps = 30, timer_period = 1 / 30 seconds.
        timer_period = 1.0 / self.fps
        self.timer = self.create_timer(timer_period, self.publish_frame)

        self.get_logger().info('Laptop webcam publisher started.')
        self.get_logger().info('Publishing: /laptop_camera/image_raw')
        self.get_logger().info('Publishing: /laptop_camera/camera_info')

    def publish_frame(self):
        """
        Read one frame from the webcam and publish it as ROS messages.

        This function is called repeatedly by the timer.
        """

        # ------------------------------------------------------------
        # 1. Read one image frame from the webcam
        # ------------------------------------------------------------
        # ret:
        #     True if reading was successful.
        #
        # frame:
        #     The actual image as an OpenCV NumPy array.
        ret, frame = self.cap.read()

        if not ret:
            self.get_logger().warn('Failed to read frame from webcam.')
            return

        # ------------------------------------------------------------
        # 2. Create a timestamp
        # ------------------------------------------------------------
        # In ROS, messages usually contain a header with:
        #     - timestamp
        #     - frame_id
        #
        # The timestamp tells other ROS nodes when this image was captured.
        now = self.get_clock().now().to_msg()

        # ------------------------------------------------------------
        # 3. Convert OpenCV image to ROS Image message
        # ------------------------------------------------------------
        # OpenCV uses BGR color order by default.
        # Therefore, we use encoding='bgr8'.
        image_msg = self.bridge.cv2_to_imgmsg(frame, encoding='bgr8')

        # Add timestamp and coordinate frame name to the image message.
        image_msg.header.stamp = now
        image_msg.header.frame_id = self.frame_id

        # ------------------------------------------------------------
        # 4. Create a CameraInfo message
        # ------------------------------------------------------------
        # CameraInfo describes the camera model.
        #
        # Before calibration:
        #     We only publish image width, height, timestamp, and frame_id.
        #
        # After calibration:
        #     This message should also contain:
        #         - intrinsic matrix K
        #         - distortion coefficients D
        #         - rectification matrix R
        #         - projection matrix P
        camera_info_msg = CameraInfo()

        camera_info_msg.header.stamp = now
        camera_info_msg.header.frame_id = self.frame_id

        camera_info_msg.width = frame.shape[1]
        camera_info_msg.height = frame.shape[0]

        # ------------------------------------------------------------
        # 5. Publish both messages
        # ------------------------------------------------------------
        # It is important that image_raw and camera_info use the same
        # timestamp and frame_id, because they describe the same camera frame.
        self.image_pub.publish(image_msg)
        self.camera_info_pub.publish(camera_info_msg)

    def destroy_node(self):
        """
        Clean up resources when the node stops.

        When we stop the ROS node, we should also release the webcam.
        """

        if self.cap.isOpened():
            self.cap.release()

        super().destroy_node()


def main(args=None):
    """
    Main function.

    This is the entry point of the program.
    """

    # Start the ROS 2 Python client library.
    rclpy.init(args=args)

    # Create one instance of our WebcamPublisher node.
    node = WebcamPublisher()

    try:
        # Keep the node alive so it can keep publishing images.
        rclpy.spin(node)

    except KeyboardInterrupt:
        # This happens when the user presses Ctrl+C.
        pass

    finally:
        # Cleanly stop the node and shut down ROS.
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()