"""Launch the Spatial AI simulation, Cartographer, and Nav2 together."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.actions import IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch.substitutions import PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    sim_launch = PathJoinSubstitution([
        FindPackageShare('spatial_ai_simulation'),
        'launch',
        'spatial_ai_mirte_master.launch.py',
    ])
    cartographer_launch = PathJoinSubstitution([
        FindPackageShare('spatial_ai_navigation'),
        'launch',
        'cartographer.launch.py',
    ])
    navigation_launch = PathJoinSubstitution([
        FindPackageShare('spatial_ai_navigation'),
        'launch',
        'navigation.launch.py',
    ])

    return LaunchDescription([
        DeclareLaunchArgument('launch_sim', default_value='true'),
        DeclareLaunchArgument('use_sim_time', default_value='true'),
        DeclareLaunchArgument('gui', default_value='true'),
        DeclareLaunchArgument('x', default_value='0.0'),
        DeclareLaunchArgument('y', default_value='0.0'),
        DeclareLaunchArgument('yaw', default_value='0.0'),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(sim_launch),
            condition=IfCondition(LaunchConfiguration('launch_sim')),
            launch_arguments={
                'gui': LaunchConfiguration('gui'),
                'x': LaunchConfiguration('x'),
                'y': LaunchConfiguration('y'),
                'yaw': LaunchConfiguration('yaw'),
                'use_twist_mux': 'false',
            }.items(),
        ),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(cartographer_launch),
            launch_arguments={
                'use_sim_time': LaunchConfiguration('use_sim_time'),
            }.items(),
        ),
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(navigation_launch),
            launch_arguments={
                'use_sim_time': LaunchConfiguration('use_sim_time'),
            }.items(),
        ),
    ])
