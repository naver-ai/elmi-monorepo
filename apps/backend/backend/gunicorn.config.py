bind = "0.0.0.0:3000"
workers = 1
proc_name = "elmi_backend"
reload = False
worker_class = "uvicorn.workers.UvicornWorker"
accesslog="../../logs/access.log"
errorlog="../../logs/error.log"
daemon = True

def on_starting(server):
    print('Started master process of ELMI backend.')