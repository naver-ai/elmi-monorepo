# ELMI Monorepo


## Initial Setup
### 1. Install Node.js and Nx.
1. Install NVM (https://github.com/nvm-sh/nvm)

2. Install the latest LTS version of Node
    ```sh
    > nvm install --lts
    ```

3. Install Nx globally
    ```sh
    > npm i -g nx
    > nx --version
    ```
    The terminal should print the Nx version.

4. Install Node dependencies on the repository
    ```sh
    > npm install
    ```



### 2. Install Python environment
1. Install Pyenv (https://github.com/pyenv/pyenv?tab=readme-ov-file#getting-pyenv)

2. Install python 3.11.8
    ```sh
    > pyenv install 3.11.8
    > pyenv install 3.11.8
    > python --version
    ```
    The terminal should get 3.11.8.

3. Install Poetry (https://python-poetry.org/docs/#installing-with-the-official-installer)
    ```sh
    > curl -sSL https://install.python-poetry.org | python3 -
    ```

4. Install python dependencies
    ```sh
    > nx run backend:install
    ```
    This will automatically run poetry install and create a new Python virtual environment at `/.venv`.

## Nx Commands for Development

### Python
### Adding a new Poetry dependency
! Do NOT use `pip` or `poetry` directly.
Use the global Nx command to add dependencies to the python project:
```sh
> nx run {project-name}:add {package-name}
```

For example, to add `torch` package to `backend`, run `nx run backend:add torch`.

After the addition, actually install the dependencies to the disk:

```sh
> nx run {project-name}:install
```


## Start the application

### Frontend web
Run `nx serve elmi-web` to start the development server. Happy coding!

### Python Backend (FastAPI)
Run `nx run backend:run-dev` To run a FastAPI unicorn server on CLI.



---

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ **This workspace has been generated by [Nx, Smart Monorepos · Fast CI.](https://nx.dev)** ✨
