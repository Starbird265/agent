from setuptools import setup, find_packages

setup(
    name='backend',
    version='0.1',
    packages=find_packages(),
    install_requires=[
        'temporalio',
        'pandas',
        'scikit-learn',
        'python-dotenv'
    ],
)