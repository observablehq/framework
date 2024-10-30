import argparse
import jinja2

parser = argparse.ArgumentParser()
parser.add_argument('--day')
args = parser.parse_args()

env = jinja2.Environment(loader=jinja2.FileSystemLoader("src/day/[day]/"))
template = env.get_template("template.md")
print(template.render(day=args.day))
