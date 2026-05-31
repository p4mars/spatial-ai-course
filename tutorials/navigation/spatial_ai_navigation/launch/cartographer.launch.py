"""Start Cartographer 2D SLAM for the Spatial AI MIRTE simulation."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
from launch.substitutions import PathJoinSubstitution


def generate_launch_description():
    configuration_directory = PathJoinSubstitution([
        FindPackageShare('spatial_ai_navigation'),
        'config',
    ])

    return LaunchDescription([
        DeclareLaunchArgument('use_sim_time', default_value='true'),
        DeclareLaunchArgument('scan_topic', default_value='/scan'),
        DeclareLaunchArgument('odom_topic', default_value='/odom'),
        Node(
            package='cartographer_ros',
            executable='cartographer_node',
            name='cartographer_node',
            output='screen',
            parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
            arguments=[
                '-configuration_directory',
                configuration_directory,
                '-configuration_basename',
                'cartographer_2d.lua',
            ],
            remappings=[
                ('scan', LaunchConfiguration('scan_topic')),
                ('odom', LaunchConfiguration('odom_topic')),
            ],
        ),
        Node(
            package='cartographer_ros',
            executable='cartographer_occupancy_grid_node',
            name='cartographer_occupancy_grid_node',
            output='screen',
            parameters=[
                {'use_sim_time': LaunchConfiguration('use_sim_time')},
                {'resolution': 0.03},
                {'publish_period_sec': 1.0},
            ],
        ),
    ])
