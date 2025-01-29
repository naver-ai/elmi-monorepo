# ELMI: an interactive web application for AI-guided sign language translation of lyrics for song signing

This is a monorepo for an artifact of ACM CHI 2025 research paper, "ELMI: Interactive and Intelligent Sign Language Translation of Lyrics for Song Signing."

Website: https://naver-ai.github.io/elmi

<img src="https://github.com/naver-ai/elmi-monorepo/blob/main/elmi_demo_loop.gif"/>


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
    > pyenv global 3.11.8
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

### 3. Run setup script

1. Run initial setup script and register `OpenAI API Key` to the local environment.
    ```sh
    > nx run setup 
    ```

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


## Cite AACessTalk

### ACM Citation

Suhyeon Yoo, Khai N. Truong, and Young-Ho Kim. 2025. ELMI: Interactive and Intelligent Sign Language Translation of Lyrics for Song Signing. In CHI Conference on Human Factors in Computing Systems (CHI ’25), April 26-May 1, 2025, Yokohama, Japan. ACM, New York, NY, USA, 21 pages. https://doi.org/10.1145/3706598.3713973

### BibTeX

```bibtex
    @inproceedings{yoo2025elmi,
      author = {Yoo, Suhyeon and Truong, Khai N and Kim, Young-Ho},
      title = {ELMI: Interactive and Intelligent Sign Language Translation of Lyrics for Song Signing},
      year = {2025},
      publisher = {Association for Computing Machinery},
      address = {New York, NY, USA},
      url = {https://doi.org/10.1145/3706598.3713973},
      doi = {10.1145/3706598.3713973},
      booktitle = {Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems},
      location = {Yokohama, Japan},
      series = {CHI '25}
    }
```

## Research Team (In the order of paper authors)

* Suhyeon Yoo (PhD Candidate at the University of Toronto) https://catherina423.blogspot.com/
* Khai N. Truong (Professor at the University of Toronto) https://www.cs.toronto.edu/~khai/
* Young-Ho Kim (Research Scientist at NAVER AI Lab) http://younghokim.net *Corresponding author


## Code maintainer

* Young-Ho Kim (Research Scientist at NAVER AI Lab) http://younghokim.net
* Suhyeon Yoo (PhD Candidate at the University of Toronto) https://catherina423.blogspot.com/