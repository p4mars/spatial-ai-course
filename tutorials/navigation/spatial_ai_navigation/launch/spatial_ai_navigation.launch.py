"""Launch the Spatial AI simulation with Nav2 using a saved map."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.actions import IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch.substitutions import PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    sim_launch = PathJoinSubstitution([
        FindPackageShare('spatial_ai_simulation'),
        'launch',
        'spatial_ai_mirte_master.launch.py',
    ])
    nav2_bringup_launch = PathJoinSubstitution([
        FindPackageShare('nav2_bringup'),
        'launch',
        'bringup_launch.py',
    ])
    params_file = PathJoinSubstitution([
        FindPackageShare('spatial_ai_navigation'),
        'config',
        'nav2_params.yaml',
    ])
    rviz_config = PathJoinSubstitution([
        FindPackageShare('nav2_bringup'),
        'rviz',
        'nav2_default_view.rviz',
    ])

    return LaunchDescription([
        DeclareLaunchArgument('map', description='Full path to saved map yaml file'),
        DeclareLaunchArgument('launch_sim', default_value='true'),
        DeclareLaunchArgument('use_sim_time', default_value='true'),
        DeclareLaunchArgument('gui', default_value='true'),
        DeclareLaunchArgument('rviz', default_value='true'),
        DeclareLaunchArgument('x', default_value='0.0'),
        DeclareLaunchArgument('y', default_value='0.0'),
        DeclareLaunchArgument('yaw', default_value='0.0'),
        DeclareLaunchArgument('autostart', default_value='true'),
        DeclareLaunchArgument('params_file', default_value=params_file),
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
            PythonLaunchDescriptionSource(nav2_bringup_launch),
            launch_arguments={
                'slam': 'False',
                'map': LaunchConfiguration('map'),
                'use_sim_time': LaunchConfiguration('use_sim_time'),
                'autostart': LaunchConfiguration('autostart'),
                'params_file': LaunchConfiguration('params_file'),
                'use_composition': 'False',
            }.items(),
        ),
        Node(
            condition=IfCondition(LaunchConfiguration('rviz')),
            package='rviz2',
            executable='rviz2',
            name='rviz2',
            output='screen',
            arguments=['-d', rviz_config],
            parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        ),
    ])
